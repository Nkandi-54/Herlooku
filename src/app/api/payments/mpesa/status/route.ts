import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";
import { queryStkPush } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const bookingId = new URL(req.url).searchParams.get("bookingId");
    const booking = bookingId ? await db.getBookingById(bookingId) : undefined;

    if (!booking || (booking.clientId !== user.id && user.role !== "admin")) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    const payment = booking.paymentRequestId
      ? await db.getMpesaPaymentById(booking.paymentRequestId)
      : undefined;

    if (!payment) return NextResponse.json({ booking, payment: null });

    // The callback is the source of truth; querying recovers when callback
    // delivery is delayed.
    if (payment.status === "pending" && payment.checkoutRequestId) {
      try {
        const result = await queryStkPush(payment.checkoutRequestId);
        const code = Number(result.ResultCode);
        if (Number.isFinite(code) && code !== 1032 && code !== 1) {
          if (code === 0) {
            const receipt = String(result.MpesaReceiptNumber || "");
            if (receipt)
              await db.confirmMpesaPayment(payment.id, receipt, result);
          } else {
            await db.failMpesaPayment(
              payment.id,
              String(result.ResultDesc || "M-Pesa payment was not completed."),
              code,
              result,
            );
          }
        }
      } catch {
        // Best-effort; the callback remains authoritative.
      }
    }

    const freshBooking = await db.getBookingById(booking.id);
    const freshPayment = await db.getMpesaPaymentById(payment.id);

    return NextResponse.json({ booking: freshBooking, payment: freshPayment });
  } catch (error: any) {
    return jsonError(error, "Could not check M-Pesa payment.");
  }
}
