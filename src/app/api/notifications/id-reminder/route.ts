import { NextResponse } from "next/server";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const state = await db.getIdReminderState(user.id);
    if (
      !state ||
      (state.id_verification_status !== "unverified" &&
        state.id_verification_status !== "rejected")
    ) {
      return NextResponse.json({ reminderDue: false });
    }

    const dueAt = state.id_reminder_last_sent_at
      ? new Date(state.id_reminder_last_sent_at).getTime() + 6 * 60 * 60 * 1000
      : new Date(state.created_at).getTime();
    return NextResponse.json({
      reminderDue: Date.now() >= dueAt,
      dueAt: new Date(dueAt).toISOString(),
    });
  } catch (error: any) {
    return jsonError(error, "Could not check verification reminders.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (
      user.idVerificationStatus !== "unverified" &&
      user.idVerificationStatus !== "rejected"
    ) {
      return NextResponse.json(
        { error: "ID reminders are only available before verification is submitted." },
        { status: 409 },
      );
    }
    const nowIso = new Date().toISOString();
    await db.markIdReminderSentAsService(user.id, nowIso);
    return NextResponse.json({ success: true, recordedAt: nowIso });
  } catch (error: any) {
    return jsonError(error, "Could not record verification reminder.");
  }
}
