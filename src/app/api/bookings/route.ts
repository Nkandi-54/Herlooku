import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  Booking,
  EngagementType,
  hiringFeeUSD,
  CHILDCARE_FEE_PER_CHILD_KES,
  KES_PER_USD,
  PROFESSIONAL_CLEANING_TIERS,
  usesProfessionalCleaningTiers,
  isAdminRole,
} from "@/types";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sanitizeBookingForWorker(booking: Booking) {
  const stripped = { ...booking };
  stripped.manualAssignment = booking.paymentMethod === "admin_manual";
  const blacklistedKeys: (keyof Booking | string)[] = [
    "platformBookingFee",
    "platformFee",
    "totalAmount",
    "hireFee",
    "paymentTransactionRef",
    "paymentMethod",
    "paymentRequestId",
    "paymentStatus",
    "tillNumber",
    "tillName",
    "dailyRate",
    "subtotal",
    "serviceFee",
    "insuranceEscrowFee",
    "amountKes",
    "amountUsd",
    "customerPhone",
    "resultCode",
    "resultDescription",
    "verifiedAt",
    "paidAt",
    "reservationExpiresAt",
    "paymentFailureReason",
  ];
  for (const key of blacklistedKeys) {
    delete (stripped as Record<string, unknown>)[key];
  }
  return stripped;
}

export async function GET(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);

    if (isAdminRole(activeUser.role)) {
      return NextResponse.json({ bookings: await db.getBookings() });
    }
    if (activeUser.role === "worker") {
      const bookings = (await db.getBookingsForWorker(activeUser.id)).map(
        sanitizeBookingForWorker,
      );
      return NextResponse.json({ bookings });
    }
    return NextResponse.json({
      bookings: await db.getBookingsForClient(activeUser.id),
    });
  } catch (error: any) {
    return jsonError(error, "Could not load bookings.");
  }
}

export async function POST(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);

    if (activeUser.role !== "client") {
      return NextResponse.json(
        { error: "Only client accounts can create bookings." },
        { status: 403 },
      );
    }

    // The client's own account must be approved by an administrator.
    if (activeUser.accountStatus !== "approved") {
      return NextResponse.json(
        {
          error:
            "Your account is still under review. You can browse and complete ID verification, but booking unlocks once an administrator approves your account.",
          code: "ACCOUNT_NOT_APPROVED",
          currentStatus: activeUser.accountStatus || "pending",
        },
        { status: 403 },
      );
    }

    if (activeUser.idVerificationStatus !== "verified") {
      return NextResponse.json(
        {
          error:
            "ID verification is strictly required before you can book or hire househelps. Both clients and helpers must be verified for safety and mutual trust.",
          code: "ID_VERIFICATION_REQUIRED",
          currentStatus: activeUser.idVerificationStatus,
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      workerId,
      serviceName,
      startDate,
      endDate,
      clientAddress,
      specialInstructions,
      serviceRequirements,
      engagementType,
      childcareChildren: childcareChildrenRaw,
      surchargeTierId,
    } = body;

    const childcareChildren = Math.max(
      0,
      Math.min(10, Math.floor(Number(childcareChildrenRaw) || 0)),
    );

    if (!workerId || !startDate || !endDate || !clientAddress) {
      return NextResponse.json(
        { error: "Missing required booking details (worker, dates, address)." },
        { status: 400 },
      );
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return NextResponse.json(
        { error: "Dates must use YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const parseBookingDate = (dateString: string) => {
      const [year, month, day] = dateString.split("-").map(Number);
      const normalized = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(normalized.getTime()) ? null : normalized;
    };

    const start = parseBookingDate(startDate);
    const end = parseBookingDate(endDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!start || !end || end < start || start < today) {
      return NextResponse.json(
        {
          error:
            "Choose valid future dates with an end date on or after the start date.",
        },
        { status: 400 },
      );
    }

    const resolvedInstructions = String(
      specialInstructions ?? serviceRequirements ?? "",
    );
    if (
      String(clientAddress).trim().length < 8 ||
      String(clientAddress).length > 240 ||
      resolvedInstructions.length > 2000
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a valid service address and keep instructions under 2,000 characters.",
        },
        { status: 400 },
      );
    }

    const workerProfile = await db.getWorkerProfileByUserId(workerId);
    if (!workerProfile) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    if (
      workerProfile.user.idVerificationStatus !== "verified" ||
      workerProfile.user.accountStatus !== "approved"
    ) {
      return NextResponse.json(
        { error: "This worker is not yet available for booking." },
        { status: 404 },
      );
    }

    const availableEngagements =
      workerProfile.engagementTypes.length > 0
        ? workerProfile.engagementTypes
        : (["daily"] as EngagementType[]);
    const selectedEngagement: EngagementType =
      engagementType === undefined
        ? availableEngagements.includes("daily")
          ? "daily"
          : availableEngagements[0]
        : engagementType;
    if (
      selectedEngagement !== "daily" &&
      selectedEngagement !== "monthly"
    ) {
      return NextResponse.json(
        { error: "Choose a valid engagement type." },
        { status: 400 },
      );
    }
    if (!availableEngagements.includes(selectedEngagement)) {
      return NextResponse.json(
        { error: "This worker does not offer the selected engagement type." },
        { status: 400 },
      );
    }

    const isAvailable = await db.isWorkerExclusivelyAvailable(
      workerId,
      startDate,
      endDate,
    );
    if (!isAvailable) {
      return NextResponse.json(
        {
          error:
            "This worker is already exclusively booked for the selected dates. Please choose different dates.",
          code: "DATES_UNAVAILABLE",
        },
        { status: 409 },
      );
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.max(
      1,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1,
    );

    const platformBookingFee = hiringFeeUSD(selectedEngagement);
    const isChildcare =
      String(serviceName || "").toLowerCase().includes("childcare") ||
      String(serviceName || "").toLowerCase().includes("nanny");
    const children = isChildcare ? childcareChildren : 0;
    // KES 1,000 per child, converted to the USD base used by all booking math.
    const childcareFee =
      (children * CHILDCARE_FEE_PER_CHILD_KES) / KES_PER_USD;

    // Professional deep cleaning is priced per home size. Only a known tier id
    // is accepted, and only for that service — the amount is looked up here,
    // never taken from the client.
    let surchargeKes = 0;
    let surchargeLabel: string | undefined;
    if (usesProfessionalCleaningTiers(String(serviceName || ""))) {
      const tier = PROFESSIONAL_CLEANING_TIERS.find((t) => t.id === surchargeTierId);
      if (tier) {
        surchargeKes = tier.surchargeKes;
        surchargeLabel = tier.label;
      }
    }
    const surchargeUsd = surchargeKes / KES_PER_USD;

    const workerExpectedDailySalary =
      selectedEngagement === "daily"
        ? workerProfile.expectedDailySalary || 8
        : 0;
    const workerExpectedMonthlySalary =
      selectedEngagement === "monthly"
        ? workerProfile.expectedMonthlySalary ||
          Math.round((workerProfile.expectedDailySalary || 8) * 26)
        : 0;
    const totalAmount =
      platformBookingFee +
      childcareFee +
      surchargeUsd +
      (selectedEngagement === "daily"
        ? workerExpectedDailySalary * totalDays
        : 0);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `HLK-${String(new Date().getFullYear()).slice(-2)}-${randomSuffix}`;

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      bookingRef,
      clientId: activeUser.id,
      workerId,
      serviceName:
        serviceName || workerProfile.services[0] || "General Househelp",
      startDate,
      endDate,
      totalDays,
      engagementType: selectedEngagement,
      platformBookingFee,
      workerExpectedDailySalary,
      workerExpectedMonthlySalary,
      totalAmount,
      childcareChildren: children,
      childcareFee,
      surchargeKes,
      surchargeLabel,
      status: "pending_payment",
      escrowStatus: "holding",
      clientAddress,
      specialInstructions: resolvedInstructions,
      createdAt: new Date().toISOString(),
    };

    const created = await db.createBooking(newBooking);

    return NextResponse.json({
      success: true,
      booking: created,
      message:
        selectedEngagement === "daily"
          ? "Booking initialized. Pay the hiring fee and booked daily wages to lock the worker."
          : "Booking initialized. Pay the hiring fee to lock the worker exclusively.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not create the booking.");
  }
}
