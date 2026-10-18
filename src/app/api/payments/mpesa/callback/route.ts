import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callbackDetails } from "@/lib/mpesa";

export const dynamic = "force-dynamic";

/** Safaricom calls this public HTTPS URL. Never accept transaction codes from the browser. */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const details = callbackDetails(payload);
    if (!details) return NextResponse.json({ ResultCode: 1, ResultDesc: "Malformed callback" }, { status: 400 });
    const payment = db.getMpesaPaymentByCheckoutRequestId(details.checkoutRequestId);
    if (!payment) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }); // safe retry response; do not disclose IDs
    if (payment.status === "paid") return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    if (details.resultCode !== 0) {
      db.failMpesaPayment(payment.id, details.resultDescription, details.resultCode, payload);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    if (!details.receipt || details.amount !== payment.amountKes) {
      db.failMpesaPayment(payment.id, "M-Pesa confirmation did not match the expected amount or receipt.", details.resultCode, payload);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    const booking = db.confirmMpesaPayment(payment.id, details.receipt, payload);
    if (!booking) {
      // Payment is real but the worker could no longer be locked: keep it for an admin-led refund.
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    // Replying non-2xx asks Safaricom to retry transient failures.
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Temporary processing error" }, { status: 500 });
  }
}
