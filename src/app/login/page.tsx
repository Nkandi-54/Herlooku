"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const tx = useCallback((copy: string) => t(`copy:${copy}`), [t]);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isConfirmed = searchParams.get("confirmed") === "true";
  const urlError = searchParams.get("error");

  // Recovery panel: "forgot" requests a reset link, "resend" re-sends the
  // signup confirmation for an address that was never activated.
  type HelpMode = "forgot" | "resend" | null;
  const [helpMode, setHelpMode] = useState<HelpMode>(
    searchParams.get("forgot") === "1" ? "forgot" : null,
  );
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");
  const [helpError, setHelpError] = useState("");

  // Auto-forward if user lands on /login with code or token_hash from verification email
  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    if (code || tokenHash) {
      router.replace(`/auth/callback?${searchParams.toString()}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (urlError) {
      setError(
        urlError === "auth-code-error"
          ? tx("The confirmation link is invalid or has expired. Please sign in or request a new link.")
          : urlError,
      );
    }
  }, [urlError, tx]);

  // Surface the outcome of landing back from a reset or confirmation link.
  useEffect(() => {
    if (searchParams.get("reset") === "1") {
      setHelpMessage(tx("Your password was changed. Sign in with your new password."));
    }
  }, [searchParams, tx]);

  const openHelp = (mode: Exclude<HelpMode, null>) => {
    setHelpMode(mode);
    setHelpError("");
    setHelpMessage("");
  };

  const sendHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMode) return;
    setHelpError("");
    setHelpMessage("");

    if (!form.email.trim()) {
      setHelpError(tx("Please enter your email address."));
      return;
    }

    setHelpLoading(true);
    try {
      const res = await fetch(`/api/auth/${helpMode === "forgot" ? "forgot-password" : "resend-confirmation"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHelpError(tx(data.error || "Something went wrong. Please try again."));
        return;
      }
      setHelpMessage(tx(data.message));
      setHelpMode(null);
    } catch {
      setHelpError(tx("Network error. Please check your connection."));
    } finally {
      setHelpLoading(false);
    }
  };

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`copy:${data.error || "Login failed. Please try again."}`));
        return;
      }
      window.dispatchEvent(new Event("auth-changed"));
      const role = data.activeUser?.role;
      const isAdmin = role === "admin" || role === "super_admin";
      router.push(
        isAdmin
          ? "/admin"
          : role === "worker"
            ? "/dashboard/worker"
            : "/dashboard/client",
      );
    } catch {
      setError(tx("Network error. Please check your connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <Image
              src="/herlooku-brand.png"
              alt="Herlooku Task Ninja"
              width={440}
              height={290}
              className="h-20 w-32 object-contain"
            />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 text-center">
            {tx("Welcome back")}
          </h1>
          <p className="text-sm text-slate-600 mt-1 text-center">
            {tx("Sign in to your Herlooku account")}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Confirmed Notice */}
            {isConfirmed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                <span>
                  {tx(
                    "Your email has been confirmed! Please sign in to access your dashboard.",
                  )}
                </span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                {tx("Email Address")}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  aria-label={tx("Email Address")}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {tx("Password")}
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {tx("Use your account password")}
                </span>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={set("password")}
                  placeholder={tx("Enter your password")}
                  aria-label={tx("Password")}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={tx(showPw ? "Hide password" : "Show password")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => openHelp("resend")}
                  className="text-[11px] font-semibold text-slate-600 hover:text-brand-800 transition-colors"
                >
                  {tx("Email not confirmed? Resend link")}
                </button>
                <button
                  type="button"
                  onClick={() => openHelp("forgot")}
                  className="text-[11px] font-semibold text-brand-800 hover:text-brand-900 transition-colors"
                >
                  {tx("Forgot password?")}
                </button>
              </div>
            </div>

            {/* Recovery panel: reset link or re-send confirmation */}
            {helpMode && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-800">
                    {helpMode === "forgot"
                      ? tx("Reset your password")
                      : tx("Resend confirmation link")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setHelpMode(null)}
                    aria-label={tx("Close")}
                    className="text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {helpMode === "forgot"
                    ? tx("Enter the email you registered with and we will send you a link to choose a new password.")
                    : tx("Enter the email you registered with and we will send a fresh confirmation link. You cannot sign in until it is opened.")}
                </p>
                <button
                  type="button"
                  onClick={sendHelp}
                  disabled={helpLoading}
                  className="w-full rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-800 hover:bg-brand-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {helpLoading
                    ? tx("Sending…")
                    : helpMode === "forgot"
                      ? tx("Send reset link")
                      : tx("Send confirmation link")}
                </button>
                {helpError && (
                  <p className="text-[11px] font-semibold text-rose-700">{helpError}</p>
                )}
              </div>
            )}

            {helpMessage && (
              <div
                role="status"
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold"
              >
                {helpMessage}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {tx("Signing in…")}
                </>
              ) : (
                <>
                  {tx("Sign In")} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-slate-500">
            {tx("New to Herlooku?")}{" "}
            <Link
              href="/register"
              className="text-brand-800 font-semibold hover:text-brand-900 transition-colors"
            >
              {tx("Create an account →")}
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
            <ShieldCheck size={12} />
            <span>{tx("All accounts verified with government-issued ID")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
