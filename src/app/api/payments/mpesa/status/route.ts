import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import { queryStkPush } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = requireAuthenticatedUser(req);
    const bookingId = new URL(req.url).searchParams.get("bookingId");
    const booking = bookingId ? db.getBookingById(bookingId) : undefined;
    if (!booking || (booking.clientId !== user.id && user.role !== "admin")) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    const payment = booking.paymentRequestId ? db.getMpesaPaymentById(booking.paymentRequestId) : undefined;
    if (!payment) return NextResponse.json({ booking, payment: null });

    // Callback is the source of truth; querying recovers when callback delivery is delayed.
    if (payment.status === "pending" && payment.checkoutRequestId) {
      try {
        const result = await queryStkPush(payment.checkoutRequestId);
        const code = Number(result.ResultCode);
        if (Number.isFinite(code) && code !== 1032 && code !== 1) {
          if (code === 0) {
            const receipt = String(result.MpesaReceiptNumber || "");
            if (receipt) db.confirmMpesaPayment(payment.id, receipt, result);
          } else {
            db.failMpesaPayment(payment.id, String(result.ResultDesc || "M-Pesa payment was not completed."), code, result);
          }
        }
      } catch {
        // Provider query is best-effort. The Safaricom callback remains the
        // source of truth, so a failed/again-pending query must never break the
        // client's polling loop or drop the pending reservation.
      }
    }
    const freshBooking = db.getBookingById(booking.id);
    const freshPayment = db.getMpesaPaymentById(payment.id);
    return NextResponse.json({ booking: freshBooking, payment: freshPayment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not check M-Pesa payment." }, { status: error.message === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
