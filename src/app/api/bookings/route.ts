import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Booking, CONSTANT_HIRING_FEE_USD } from "@/types";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sanitizeBookingForWorker(booking: Booking) {
  const stripped = { ...booking };
  const blacklistedKeys = new Set([
    "platformBookingFee",
    "platformFee",
    "totalAmount",
    "hireFee",
    "paymentTransactionRef",
    "paymentMethod",
    "paymentRequestId",
    "paymentStatus",
    "paymentVerificationStatus",
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
  ]);

  for (const key of blacklistedKeys) {
    delete (stripped as Record<string, unknown>)[key];
  }

  return stripped;
}

export async function GET(req: Request) {
  let activeUser;
  try { activeUser = requireAuthenticatedUser(req); } catch { return NextResponse.json({ error: "Sign in required." }, { status: 401 }); }

  if (activeUser.role === "admin") {
    const allBookings = db.getBookings();
    return NextResponse.json({ bookings: allBookings });
  }

  if (activeUser.role === "worker") {
    const workerBookings = db.getBookingsForWorker(activeUser.id).map(sanitizeBookingForWorker);
    return NextResponse.json({ bookings: workerBookings });
  }

  // Client
  const clientBookings = db.getBookingsForClient(activeUser.id);
  return NextResponse.json({ bookings: clientBookings });
}

export async function POST(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);

    if (activeUser.role !== "client") {
      return NextResponse.json({ error: "Only client accounts can create bookings." }, { status: 403 });
    }

    // 0. The client's own account must be approved by an administrator. A brand
    // new signup is pending review and may not transact until approved.
    if (activeUser.accountStatus !== "approved") {
      return NextResponse.json(
        {
          error:
            "Your account is still under review. You can browse and complete ID verification, but booking unlocks once an administrator approves your account.",
          code: "ACCOUNT_NOT_APPROVED",
          currentStatus: activeUser.accountStatus || "pending",
        },
        { status: 403 }
      );
    }

    // 1. Mandatory Client ID Verification check
    if (activeUser.idVerificationStatus !== "verified") {
      return NextResponse.json(
        {
          error:
            "ID verification is strictly required before you can book or hire househelps. Both clients and helpers must be verified for safety and mutual trust.",
          code: "ID_VERIFICATION_REQUIRED",
          currentStatus: activeUser.idVerificationStatus,
        },
        { status: 403 }
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
    } = body;

    if (!workerId || !startDate || !endDate || !clientAddress) {
      return NextResponse.json(
        { error: "Missing required booking details (worker, dates, address)." },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ error: "Dates must use YYYY-MM-DD." }, { status: 400 });
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
      return NextResponse.json({ error: "Choose valid future dates with an end date on or after the start date." }, { status: 400 });
    }
    const resolvedInstructions = String(specialInstructions ?? serviceRequirements ?? "");
    if (String(clientAddress).trim().length < 8 || String(clientAddress).length > 240 || resolvedInstructions.length > 2000) {
      return NextResponse.json({ error: "Please provide a valid service address and keep instructions under 2,000 characters." }, { status: 400 });
    }

    // Check worker exists and is verified
    const workerProfile = db.getWorkerProfileByUserId(workerId);
    if (!workerProfile) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    // A worker must be BOTH ID-verified AND approved by an administrator before
    // any client can book them. An unapproved applicant is invisible and unbookable.
    if (
      workerProfile.user.idVerificationStatus !== "verified" ||
      workerProfile.user.accountStatus !== "approved"
    ) {
      return NextResponse.json(
        { error: "This worker is not yet available for booking." },
        { status: 404 }
      );
    }

    // 2. Exclusivity check
    const isAvailable = db.isWorkerExclusivelyAvailable(workerId, startDate, endDate);
    if (!isAvailable) {
      return NextResponse.json(
        {
          error:
            "This worker is already exclusively booked for the selected dates. Please choose different dates.",
          code: "DATES_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    // Calculate dates
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // WEB OWNER BOOKING FEE MODEL:
    // Upfront booking fee is paid directly to the web owner ($15 = Ksh 1,950).
    // CONSTANT PLATFORM HIRING FEE MODEL:
    // Upfront hiring fee is set to a constant 3,000 Kenyan Shillings for all workers.
    // The web does NOT handle worker salary.
    // The worker's stated salary is paid directly by the client to the worker at the end of each day.
    const platformBookingFee = CONSTANT_HIRING_FEE_USD; // Constant Ksh 3,000 paid to web owner
    const workerExpectedDailySalary = workerProfile.expectedDailySalary || 8;
    const totalAmount = platformBookingFee; // Website only charges the constant hiring fee

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `HLK-${new Date().getFullYear()}-${randomSuffix}`;

    const newBooking: Booking = {
      id: "bkg_" + Date.now().toString(36),
      bookingRef,
      clientId: activeUser.id,
      workerId,
      serviceName: serviceName || workerProfile.services[0] || "General Househelp",
      startDate,
      endDate,
      totalDays,
      platformBookingFee,
      workerExpectedDailySalary,
      totalAmount,
      status: "pending_payment",
      escrowStatus: "holding",
      clientAddress,
      specialInstructions: resolvedInstructions,
      createdAt: new Date().toISOString(),
    };

    const created = db.createBooking(newBooking);

    return NextResponse.json({
      success: true,
      booking: created,
      message: "Booking initialized. Pay upfront booking fee directly to website owner to lock worker.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message === "UNAUTHENTICATED" ? "Sign in required." : error.message }, { status: error.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
