import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();
    const booking = await db.getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (action === "complete") {
      if (
        booking.status !== "confirmed_exclusive" &&
        booking.status !== "in_progress"
      ) {
        return NextResponse.json(
          { error: "Only active bookings can be marked complete." },
          { status: 409 },
        );
      }
      await db.updateBookingAsService(booking.id, { status: "completed" });
    } else if (action === "mark_worker_paid") {
      if (
        booking.engagementType !== "daily" ||
        booking.status !== "completed" ||
        booking.escrowStatus !== "holding"
      ) {
        return NextResponse.json(
          { error: "Only completed daily bookings with wages held can be marked paid." },
          { status: 409 },
        );
      }
      await db.updateBookingAsService(booking.id, { escrow_status: "released" });
    } else {
      return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });
    }

    return NextResponse.json({ booking: await db.getBookingById(id) });
  } catch (error: any) {
    return jsonError(error, "Could not update the booking.");
  }
}
