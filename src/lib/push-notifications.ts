import "server-only";

import webPush from "web-push";
import { db } from "./db";

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "Web Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
  }
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:privacy@herlookutaskninja.vercel.app",
    publicKey,
    privateKey,
  );
}

export async function sendIdVerificationReminder(subscription: PushSubscription) {
  configureWebPush();
  await webPush.sendNotification(
    subscription,
    JSON.stringify({
      title: "Complete your ID verification",
      body: "Upload your ID and selfie to finish account verification.",
      url: "/verify-id",
      icon: "/icon.svg",
      badge: "/icon.svg",
    }),
    { TTL: 6 * 60 * 60 },
  );
}

let lastAutoDispatchTime = 0;

/**
 * Autonomous dispatcher: checks and sends due notifications directly from the website.
 * Runs non-blocking whenever user activity touches reminder endpoints.
 * Throttled to run at most once every 5 minutes per server instance.
 */
export async function dispatchDueRemindersOpportunistically() {
  if (!isWebPushConfigured()) return;

  const now = Date.now();
  if (now - lastAutoDispatchTime < 5 * 60 * 1000) {
    return;
  }
  lastAutoDispatchTime = now;

  try {
    const nowDate = new Date(now);
    const dueUsers = await db.getDueIdRemindersAsService(nowDate);
    if (dueUsers.length === 0) return;

    for (const user of dueUsers) {
      if (!user.subscriptions || user.subscriptions.length === 0) continue;
      let delivered = false;
      for (const sub of user.subscriptions) {
        try {
          await sendIdVerificationReminder({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          });
          delivered = true;
        } catch (error: any) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await db.deletePushSubscriptionByIdAsService(sub.id);
          }
        }
      }
      if (delivered) {
        await db.markIdReminderSentAsService(user.id, nowDate.toISOString());
      }
    }
  } catch (error) {
    // Non-blocking background catch
    console.warn("Autonomous reminder dispatch skipped:", error);
  }
}
