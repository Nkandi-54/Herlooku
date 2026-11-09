import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isWebPushConfigured,
  sendIdVerificationReminder,
} from "@/lib/push-notifications";
import { requireAdminUser } from "@/lib/auth";
import type { User } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function executeReminderJob(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCronAuth = Boolean(secret && authHeader === `Bearer ${secret}`);
  // Vercel Cron invocations carry this header and are already authenticated by
  // the platform, so they work even when CRON_SECRET is not configured.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;

  let isAuthorized = isCronAuth || isVercelCron;
  let callingAdminUser: User | null = null;
  if (!isAuthorized) {
    try {
      callingAdminUser = await requireAdminUser(req);
      isAuthorized = true;
    } catch {
      // Not admin
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        error:
          "Web Push is not configured on this deployment. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        code: "PUSH_NOT_CONFIGURED",
      },
      { status: 503 },
    );
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

    if (callingAdminUser) {
      try {
        const adminSubs = await db.getPushSubscriptionsForUserAsService(callingAdminUser.id);
        for (const sub of adminSubs) {
          try {
            await sendIdVerificationReminder({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            });
            sent += 1;
          } catch (error) {
            const statusCode =
              typeof error === "object" && error !== null && "statusCode" in error
                ? (error as { statusCode?: number }).statusCode
                : undefined;
            if (statusCode === 404 || statusCode === 410) {
              await db.deletePushSubscriptionByIdAsService(sub.id);
            }
            failed += 1;
            console.error("Could not send the admin push test notification.", error);
          }
        }
      } catch (error) {
        failed += 1;
        console.error("Could not load admin push subscriptions.", error);
      }
    }

    return NextResponse.json({
      success: true,
      usersChecked: dueUsers.length,
      deviceNotificationsSent: sent,
      inAppOnly,
      failed,
      // Accounts that are due but have never enabled push on a device. They
      // still see the in-app reminder; nothing can be pushed to them.
      unsubscribedAccounts: inAppOnly,
      executedAt: now.toISOString(),
    });
  } catch (error) {
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
