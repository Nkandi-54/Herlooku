import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendIdVerificationReminder } from "@/lib/push-notifications";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function executeReminderJob(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCronAuth = Boolean(secret && authHeader === `Bearer ${secret}`);

  let isAuthorized = isCronAuth;
  if (!isAuthorized) {
    try {
      await requireAdminUser(req);
      isAuthorized = true;
    } catch {
      // Not admin
    }
  }

  if (!isAuthorized) {
    if (!secret) {
      return NextResponse.json({ error: "Reminder scheduler is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const dueUsers = await db.getDueIdRemindersAsService(now);
    let sent = 0;
    let inAppOnly = 0;
    let failed = 0;

    for (const user of dueUsers) {
      if (user.subscriptions.length === 0) {
        inAppOnly += 1;
        continue;
      }

      let delivered = false;
      for (const subscription of user.subscriptions) {
        try {
          await sendIdVerificationReminder({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          });
          delivered = true;
          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await db.deletePushSubscriptionByIdAsService(subscription.id);
          } else {
            console.error("Could not send an ID verification reminder.", error);
          }
          failed += 1;
        }
      }
      if (delivered) {
        await db.markIdReminderSentAsService(user.id, now.toISOString());
      }
    }

    return NextResponse.json({
      success: true,
      usersChecked: dueUsers.length,
      deviceNotificationsSent: sent,
      inAppOnly,
      failed,
      executedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("ID verification reminder job failed.", error);
    return NextResponse.json(
      { error: "ID verification reminders could not be processed." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return executeReminderJob(req);
}

export async function POST(req: Request) {
  return executeReminderJob(req);
}
