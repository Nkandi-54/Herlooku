import { NextResponse } from "next/server";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";
import { isAdminRole } from "@/types";
import { db } from "@/lib/db";
import { isWebPushConfigured } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        {
          error:
            "Device reminders are not configured on this deployment yet. Please try again later.",
          code: "PUSH_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const user = await requireAuthenticatedUser(req);
    const isAdmin = isAdminRole(user.role);
    if (
      !isAdmin &&
      user.idVerificationStatus !== "unverified" &&
      user.idVerificationStatus !== "rejected"
    ) {
      return NextResponse.json(
        { error: "ID reminders are only available before verification is submitted." },
        { status: 409 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Provide valid JSON." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Provide a valid push subscription." }, { status: 400 });
    }
    const subscription = body as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      subscription.endpoint.length > 4096 ||
      typeof subscription.keys?.p256dh !== "string" ||
      subscription.keys.p256dh.length > 500 ||
      typeof subscription.keys.auth !== "string" ||
      subscription.keys.auth.length > 200
    ) {
      return NextResponse.json({ error: "The device push subscription is invalid." }, { status: 400 });
    }

    await db.savePushSubscriptionAsService({
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Could not enable device reminders.");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Provide valid JSON." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Provide a valid device endpoint." }, { status: 400 });
    }
    const endpoint = (body as { endpoint?: unknown }).endpoint;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "Provide a valid device endpoint." }, { status: 400 });
    }
    await db.deletePushSubscriptionAsService(user.id, endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Could not disable device reminders.");
  }
}
