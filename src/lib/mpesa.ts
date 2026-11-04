import "server-only";

const sandboxBaseUrl = "https://sandbox.safaricom.co.ke";
const productionBaseUrl = "https://api.safaricom.co.ke";

type MpesaConfig = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
};

export class MpesaConfigurationError extends Error {}

function config(): MpesaConfig {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  const transactionType = (process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline") as MpesaConfig["transactionType"];
  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    throw new MpesaConfigurationError(
      "M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY and MPESA_CALLBACK_URL."
    );
  }
  if (!/^https:\/\//.test(callbackUrl)) {
    throw new MpesaConfigurationError("MPESA_CALLBACK_URL must be a public HTTPS URL.");
  }
  if (!["CustomerPayBillOnline", "CustomerBuyGoodsOnline"].includes(transactionType)) {
    throw new MpesaConfigurationError("MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.");
  }
  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl, transactionType };
}

function baseUrl() {
  return process.env.MPESA_ENVIRONMENT === "production" ? productionBaseUrl : sandboxBaseUrl;
}

export function normaliseKenyanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const phone = digits.startsWith("0") ? `254${digits.slice(1)}` : digits.startsWith("7") || digits.startsWith("1") ? `254${digits}` : digits;
  if (!/^254(7|1)\d{8}$/.test(phone)) {
    throw new Error("Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678.");
  }
  return phone;
}

async function accessToken() {
  const settings = config();
  const credentials = Buffer.from(`${settings.consumerKey}:${settings.consumerSecret}`).toString("base64");
  const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || "Could not authenticate with M-Pesa.");
  }
  return result.access_token as string;
}

function timestamp() {
  const now = new Date();
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function password(settings: MpesaConfig, at: string) {
  return Buffer.from(`${settings.shortcode}${settings.passkey}${at}`).toString("base64");
}

export async function requestStkPush(input: { phoneNumber: string; amountKes: number; accountReference: string; description: string }) {
  const settings = config();
  const at = timestamp();
  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: settings.shortcode,
      Password: password(settings, at),
      Timestamp: at,
      TransactionType: settings.transactionType,
      Amount: Math.round(input.amountKes),
      PartyA: input.phoneNumber,
      // For CustomerPayBillOnline, PartyB is the PayBill shortcode and the
      // AccountReference identifies the destination account.
      PartyB: settings.shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: settings.callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.description.slice(0, 13),
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ResponseCode !== "0" || !result.CheckoutRequestID) {
    throw new Error(result.errorMessage || result.ResponseDescription || "M-Pesa could not start the payment prompt.");
  }
  return { merchantRequestId: result.MerchantRequestID as string, checkoutRequestId: result.CheckoutRequestID as string };
}

export async function queryStkPush(checkoutRequestId: string) {
  const settings = config();
  const at = timestamp();
  const response = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: settings.shortcode,
      Password: password(settings, at),
      Timestamp: at,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.errorMessage || "Unable to check the M-Pesa payment status.");
  return result as Record<string, unknown>;
}

export function callbackDetails(payload: Record<string, any>) {
  const callback = payload?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID || typeof callback.ResultCode !== "number") return null;
  const items = callback.CallbackMetadata?.Item || [];
  const item = (name: string) => items.find((entry: { Name?: string }) => entry.Name === name)?.Value;
  return {
    checkoutRequestId: String(callback.CheckoutRequestID),
    resultCode: callback.ResultCode as number,
    resultDescription: String(callback.ResultDesc || "M-Pesa response received"),
    receipt: item("MpesaReceiptNumber") ? String(item("MpesaReceiptNumber")) : undefined,
    amount: typeof item("Amount") === "number" ? item("Amount") : Number(item("Amount")),
  };
}
