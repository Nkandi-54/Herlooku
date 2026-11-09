"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const SIX_HOURS = 6 * 60 * 60 * 1000;

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function VerificationReminder() {
  const { t } = useLanguage();
  const tx = useCallback((copy: string) => t(`copy:${copy}`), [t]);
  const [userId, setUserId] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [reminderDue, setReminderDue] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const syncPushSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    const response = await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || tx("Could not enable device reminders."));
    }
    return true;
  }, [tx]);

  const checkReminder = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch("/api/notifications/id-reminder", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const due = data.reminderDue === true;
      setReminderDue(due);
      if (!due) {
        setDismissed(false);
        return;
      }
      const dismissedAt = Number(
        window.localStorage.getItem(`id-reminder-dismissed-${userId}`) || 0,
      );
      const isDismissed = Date.now() - dismissedAt < SIX_HOURS;
      setDismissed(isDismissed);

      // If due and not dismissed, show browser/OS notification directly from the website
      if (!isDismissed && "Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(tx("Complete your ID verification"), {
            body: tx("Upload your ID and selfie to finish account verification."),
            icon: "/herkolu-island-logo.png",
            badge: "/icon.svg",
            data: { url: "/verify-id" },
            tag: "id-verification-reminder",
          });
        } catch (notifErr) {
          console.warn("Could not display browser notification directly:", notifErr);
        }
      }
    } catch (checkError) {
      console.error("Could not check ID verification reminder status.", checkError);
    }
  }, [tx, userId]);

  useEffect(() => {
    setPushSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const user = data.activeUser;
        if (
          user?.id &&
          (user.idVerificationStatus === "unverified" ||
            user.idVerificationStatus === "rejected")
        ) {
          setUserId(user.id);
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            setPushEnabled(await syncPushSubscription());
          }
        } else {
          setUserId("");
          setPushEnabled(false);
          setReminderDue(false);
        }
      } catch (loadError) {
        console.error("Could not load identity reminder preferences.", loadError);
      }
    };
    void loadUser();
    window.addEventListener("auth-changed", loadUser);
    return () => window.removeEventListener("auth-changed", loadUser);
  }, [syncPushSubscription]);

  useEffect(() => {
    if (!userId) return;
    void checkReminder();
    const interval = window.setInterval(checkReminder, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [checkReminder, userId]);

  const enablePush = async () => {
    setEnabling(true);
    setError("");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error(tx("Device reminders are not configured yet."));
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(tx("Allow notifications in your browser settings to receive device reminders."));
        return;
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || tx("Could not enable device reminders."));
      }
      setPushEnabled(true);
    } catch (enableError) {
      setError(
        enableError instanceof Error
          ? enableError.message
          : tx("Could not enable device reminders."),
      );
    } finally {
      setEnabling(false);
    }
  };

  if (!userId) return null;

  const showFallback = reminderDue && !dismissed;
  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[90] w-[min(24rem,calc(100vw-2rem))] space-y-3"
    >
      {showFallback ? (
        <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <Image
              src="/herkolu-island-logo.png"
              alt=""
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 rounded-full object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">
                {tx("Complete ID verification")}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {tx("Upload your ID and selfie to finish account verification.")}
              </p>
              <Link
                href="/verify-id"
                className="mt-3 inline-flex rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white"
              >
                {tx("Go to ID verification")}
              </Link>
            </div>
            <button
              type="button"
              aria-label={tx("Dismiss reminder")}
              onClick={async () => {
                window.localStorage.setItem(
                  `id-reminder-dismissed-${userId}`,
                  String(Date.now()),
                );
                setDismissed(true);
                try {
                  await fetch("/api/notifications/id-reminder", { method: "POST" });
                } catch {
                  // Non-blocking
                }
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {!pushEnabled && pushSupported && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <Bell size={18} className="shrink-0 text-brand-600" />
          <p className="flex-1 text-[11px] text-slate-600">
            {tx("Get a device reminder every 6 hours until you submit your ID and selfie.")}
          </p>
          <button
            type="button"
            disabled={enabling}
            onClick={enablePush}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
          >
            {enabling ? tx("Enabling…") : tx("Enable")}
          </button>
        </div>
      ) : null}
      {!pushEnabled && pushSupported && !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600 shadow">
          {tx("Device reminders are not configured yet. In-app reminders will still appear when due.")}
        </p>
      ) : null}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow"
        >
          {error}
        </p>
      )}
    </aside>
  );
}
