import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Payment-result lookup for a booking.
 *
 * A worker is locked ONLY by the server-side Safaricom callback
 * (POST /api/payments/mpesa/callback). The browser can never confirm a payment
 * or lock a worker, so there is deliberately no POST handler here that mutates
 * the booking. Clients start payment via /api/payments/mpesa/stk and poll this
 * endpoint, or /api/payments/mpesa/status, for the provider-confirmed result.
 */
export async function GET(req: Request) {
  try {
    const user = requireAuthenticatedUser(req);
    const bookingId = new URL(req.url).searchParams.get("bookingId");
    const booking = bookingId ? db.getBookingById(bookingId) : undefined;
    if (!booking || (booking.clientId !== user.id && user.role !== "admin")) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    const payment = booking.paymentRequestId ? db.getMpesaPaymentById(booking.paymentRequestId) : undefined;
    return NextResponse.json({ booking, payment: payment ?? null });
  } catch (error: any) {
    const message = error.message === "UNAUTHENTICATED" ? "Sign in required." : error.message || "Could not load checkout status.";
    return NextResponse.json({ error: message }, { status: error.message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}

/**
 * The browser cannot submit a transaction code, Till reference or receipt.
 * Any attempt to confirm payment client-side is rejected; the worker is locked
 * exclusively by the provider callback only.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Payments cannot be confirmed from the browser. Start an M-Pesa prompt via /api/payments/mpesa/stk; a worker is locked only after Safaricom confirms the payment through the server callback.",
      code: "PROVIDER_CONFIRMATION_REQUIRED",
    },
    { status: 405 }
  );
}

