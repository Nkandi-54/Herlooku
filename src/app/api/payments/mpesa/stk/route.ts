import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import { CONSTANT_HIRING_FEE_KES, MpesaPayment } from "@/types";
import { MpesaConfigurationError, normaliseKenyanPhone, requestStkPush } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = requireAuthenticatedUser(req);
    const { bookingId, phoneNumber } = await req.json();
    if (!bookingId || !phoneNumber) return NextResponse.json({ error: "Booking ID and M-Pesa number are required." }, { status: 400 });
    if (user.role !== "client" || user.accountStatus !== "approved") {
      return NextResponse.json(
        { error: "Only approved client accounts can initiate a payment.", code: "ACCOUNT_NOT_APPROVED" },
        { status: 403 }
      );
    }
    if (user.idVerificationStatus !== "verified") {
      return NextResponse.json(
        { error: "Complete ID verification before paying for a hire.", code: "ID_VERIFICATION_REQUIRED" },
        { status: 403 }
      );
    }
    const booking = db.getBookingById(String(bookingId));
    if (!booking || booking.clientId !== user.id) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "confirmed_exclusive" || booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "This booking has already been paid and locked." }, { status: 409 });
    }
    if (!db.isWorkerExclusivelyAvailable(booking.workerId, booking.startDate, booking.endDate)) {
      return NextResponse.json({ error: "This worker is no longer available for these dates." }, { status: 409 });
    }
    const existing = db.getPendingMpesaPaymentForBooking(booking.id);
    if (existing && new Date(existing.updatedAt).getTime() > Date.now() - 120_000) {
      return NextResponse.json({ error: "A payment prompt is already pending. Complete or wait two minutes before retrying.", paymentId: existing.id }, { status: 409 });
    }

    const phone = normaliseKenyanPhone(String(phoneNumber));
    const stk = await requestStkPush({
      phoneNumber: phone,
      amountKes: CONSTANT_HIRING_FEE_KES,
      accountReference: booking.bookingRef,
      description: "Herlooku hire",
    });
    const now = new Date().toISOString();
    const payment: MpesaPayment = {
      id: `mpesa_${crypto.randomUUID()}`,
      bookingId: booking.id,
      clientId: user.id,
      amountKes: CONSTANT_HIRING_FEE_KES,
      phoneNumber: phone,
      status: "pending",
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      createdAt: now,
      updatedAt: now,
    };
    db.createMpesaPayment(payment);
    db.updateBooking(booking.id, {
      paymentStatus: "pending",
      paymentRequestId: payment.id,
      paymentMethod: "M-Pesa STK Push",
      reservationExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    return NextResponse.json({ success: true, paymentId: payment.id, checkoutRequestId: stk.checkoutRequestId, message: "Check your phone and enter your M-Pesa PIN. Your worker is not locked until Safaricom confirms payment." }, { status: 201 });
  } catch (error: any) {
    const status = error.message === "UNAUTHENTICATED" ? 401 : error instanceof MpesaConfigurationError ? 503 : 400;
    return NextResponse.json({ error: error.message || "Could not initiate M-Pesa payment." }, { status });
  }
}
