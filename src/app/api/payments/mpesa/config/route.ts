import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public, non-secret view of whether the M-Pesa integration is ready.
 * Lets the checkout explain "payments are not configured yet" instead of
 * failing with an opaque provider error. Never exposes credentials.
 */
export async function GET() {
  const required = {
    MPESA_CONSUMER_KEY: Boolean(process.env.MPESA_CONSUMER_KEY),
    MPESA_CONSUMER_SECRET: Boolean(process.env.MPESA_CONSUMER_SECRET),
    MPESA_SHORTCODE: Boolean(process.env.MPESA_SHORTCODE),
    MPESA_PASSKEY: Boolean(process.env.MPESA_PASSKEY),
    MPESA_CALLBACK_URL: Boolean(process.env.MPESA_CALLBACK_URL),
  };
  const missing = Object.entries(required)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  return NextResponse.json({
    configured: missing.length === 0,
    paybillNumber: process.env.MPESA_SHORTCODE || "542542",
    environment:
      process.env.MPESA_ENVIRONMENT === "production" ? "production" : "sandbox",
    callbackIsHttps: /^https:\/\//.test(process.env.MPESA_CALLBACK_URL || ""),
    missing,
  });
}
