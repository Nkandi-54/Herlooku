import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callbackDetails } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

/**
 * Safaricom calls this public HTTPS URL after the customer authorises the STK
 * prompt. It is the ONLY place a worker can be locked.
 *
 * The payload is not signed, so we never trust it blindly: we look up the
 * payment by CheckoutRequestID (a value only Safaricom and our server know) and
 * verify the amount before confirming anything.
 */
export async function POST(req: Request) {
  let checkoutRequestId: string | undefined;
  try {
    const payload = await req.json();
    const details = callbackDetails(payload);
    checkoutRequestId = details?.checkoutRequestId;

    if (!details) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Malformed callback" },
        { status: 400 },
      );
    }

    const payment = await db.getMpesaPaymentByCheckoutRequestId(
      details.checkoutRequestId,
    );

    // Unknown checkout ID: acknowledge so Safaricom stops retrying, but do
    // nothing. Never disclose whether the ID exists.
    if (!payment) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Idempotent: repeated callbacks are acknowledged without reprocessing.
    if (payment.status === "paid") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (details.resultCode !== 0) {
      await db.failMpesaPayment(
        payment.id,
        details.resultDescription,
        details.resultCode,
        payload,
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (!details.receipt || details.amount !== payment.amountKes) {
      await db.failMpesaPayment(
        payment.id,
        "M-Pesa confirmation did not match the expected amount or receipt.",
        details.resultCode,
        payload,
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const booking = await db.confirmMpesaPayment(
      payment.id,
      details.receipt,
      payload,
    );
    if (!booking) {
      // Payment is real but the worker could no longer be locked: retained for
      // an admin-led refund.
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    // A non-2xx asks Safaricom to retry transient failures.
    console.error(
      `[mpesa-callback] Failed to process callback for checkout ${checkoutRequestId ?? "unknown"}:`,
      error,
    );
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Temporary processing error" },
      { status: 500 },
    );
  }
}
