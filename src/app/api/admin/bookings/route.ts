import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdminUser } from "@/lib/auth";
import { Booking } from "@/types";

export const dynamic = "force-dynamic";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export async function POST(req: Request) {
  try {
    await requireAdminUser(req);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Provide valid assignment details." }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Provide valid JSON." }, { status: 400 });
    }

    const { clientId, workerId, startDate, endDate, clientAddress, serviceName, specialInstructions } = body;
    if (
      typeof clientId !== "string" ||
      typeof workerId !== "string" ||
      typeof clientAddress !== "string" ||
      typeof serviceName !== "string"
    ) {
      return NextResponse.json({ error: "Choose a client and worker, dates, service, and address." }, { status: 400 });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!start || !end || start < today || end < start) {
      return NextResponse.json({ error: "Choose valid future dates with an end date on or after the start date." }, { status: 400 });
    }
    if (
      clientAddress.trim().length < 8 ||
      clientAddress.length > 240 ||
      serviceName.trim().length < 2 ||
      serviceName.trim().length > 120 ||
      (typeof specialInstructions === "string" && specialInstructions.length > 2000)
    ) {
      return NextResponse.json({ error: "Check the service, address, and instructions." }, { status: 400 });
    }

    const [client, workerProfile] = await Promise.all([
      db.getUserByIdAsService(clientId),
      db.getWorkerProfileByUserId(workerId),
    ]);
    if (!client || client.role !== "client" || client.deletedAt) {
      return NextResponse.json({ error: "Active client account not found." }, { status: 404 });
    }
    if (
      client.accountStatus !== "approved" ||
      client.idVerificationStatus !== "verified"
    ) {
      return NextResponse.json({ error: "The client must be approved and ID verified." }, { status: 409 });
    }
    if (!workerProfile || workerProfile.user.deletedAt) {
      return NextResponse.json({ error: "Active worker account not found." }, { status: 404 });
    }
    if (
      workerProfile.user.accountStatus !== "approved" ||
      workerProfile.user.idVerificationStatus !== "verified"
    ) {
      return NextResponse.json({ error: "The worker must be approved and ID verified." }, { status: 409 });
    }

    const available = await db.isWorkerExclusivelyAvailable(workerId, startDate as string, endDate as string);
    if (!available) {
      return NextResponse.json({ error: "This worker is already booked for some of the selected dates." }, { status: 409 });
    }

    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const booking: Booking = {
      id: crypto.randomUUID(),
      bookingRef: `HLK-${String(new Date().getFullYear()).slice(-2)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      clientId,
      workerId,
      serviceName: serviceName.trim(),
      startDate: startDate as string,
      endDate: endDate as string,
      totalDays,
      engagementType: "daily",
      platformBookingFee: 0,
      workerExpectedDailySalary: workerProfile.expectedDailySalary,
      workerExpectedMonthlySalary: 0,
      totalAmount: 0,
      status: "confirmed_exclusive",
      escrowStatus: "holding",
      clientAddress: clientAddress.trim(),
      specialInstructions:
        typeof specialInstructions === "string" ? specialInstructions.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const created = await db.createManualBookingAsService(booking);
    return NextResponse.json({
      success: true,
      booking: created,
      message: "Worker assigned. No payment was recorded; wages are arranged directly between the client and worker.",
    }, { status: 201 });
  } catch (error: any) {
    if (String(error?.message).toLowerCase().includes("already exclusively booked")) {
      return NextResponse.json({ error: "This worker is already booked for some of the selected dates." }, { status: 409 });
    }
    return jsonError(error, "Could not assign the worker.");
  }
}
