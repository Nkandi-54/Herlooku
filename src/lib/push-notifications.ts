import "server-only";

import webPush from "web-push";

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Web push is not configured. Set the VAPID public and private keys.");
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
      icon: "/herkolu-island-logo.png",
      badge: "/icon.svg",
    }),
    { TTL: 6 * 60 * 60 },
  );
}
