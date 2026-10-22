import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";
import { isAdminRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Payment-result lookup for a booking.
 *
 * A worker is locked ONLY by the server-side Safaricom callback. The browser
 * can never confirm a payment or lock a worker.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const bookingId = new URL(req.url).searchParams.get("bookingId");
    const booking = bookingId ? await db.getBookingById(bookingId) : undefined;

    if (!booking || (booking.clientId !== user.id && !isAdminRole(user.role))) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    const payment = booking.paymentRequestId
      ? await db.getMpesaPaymentById(booking.paymentRequestId)
      : undefined;

    return NextResponse.json({ booking, payment: payment ?? null });
  } catch (error: any) {
    return jsonError(error, "Could not load checkout status.");
  }
}

/**
 * The browser cannot submit a transaction code, Till reference or receipt.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Payments cannot be confirmed from the browser. Start an M-Pesa prompt via /api/payments/mpesa/stk; a worker is locked only after Safaricom confirms the payment through the server callback.",
      code: "PROVIDER_CONFIRMATION_REQUIRED",
    },
    { status: 405 },
  );
}
