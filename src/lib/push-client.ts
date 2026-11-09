"use client";

/**
 * Browser-side Web Push helpers shared by the reminder banner, the verify-ID
 * page and the admin workbench. Keeping the subscription flow in one place
 * means every entry point registers the same service worker, uses the same
 * VAPID key and reports the same errors.
 */

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "error"; message: string };

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Returns the existing subscription for this browser, if any. */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Requests permission (if needed), subscribes this browser and stores the
 * subscription on the server. Safe to call repeatedly: an existing
 * subscription is re-sent to the server instead of creating a new one.
 */
export async function enablePushNotifications(): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Push notifications are not supported in this browser.",
    };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return {
      ok: false,
      reason: "error",
      message: "Device reminders are not configured on this deployment yet.",
    };
  }

  try {
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message:
          "Allow notifications in your browser settings to receive device reminders.",
      };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      }));

    const response = await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        ok: false,
        reason: "error",
        message: data.error || "Could not enable device reminders.",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not enable device reminders.",
    };
  }
}
