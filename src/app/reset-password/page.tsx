"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useLanguage } from "@/i18n/LanguageContext";

const MIN_LENGTH = 8;

const rules = [
  {
    test: (v: string) => v.length >= MIN_LENGTH,
    label: "At least 8 characters",
  },
  { test: (v: string) => /[a-zA-Z]/.test(v), label: "A letter" },
  { test: (v: string) => /[0-9]/.test(v), label: "A number" },
];

/**
 * Landing page for a Supabase password-recovery link.
 *
 * /auth/callback has already exchanged the emailed code for a session, so this
 * page only needs to collect a new password and hand it to
 * supabase.auth.updateUser.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.user));
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const allRulesPass = rules.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRulesPass) {
      setError(tx("Choose a password with at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setError(tx("Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login?reset=1"), 2200);
    } catch {
      setError(tx("Network error. Please check your connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
            {tx("Choose a new password")}
          </h1>
          <p className="text-sm text-slate-600 mt-1 text-center">
            {tx("Pick something you have not used on Herlooku before.")}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-700" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {tx("Password updated")}
              </h2>
              <p className="text-sm text-slate-600">
                {tx("Taking you to sign in…")}
              </p>
              <Link
                href="/login?reset=1"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {tx("Continue to sign in")} <ArrowRight size={16} />
              </Link>
            </div>
          ) : checkingSession ? (
            <p className="text-center text-sm text-slate-600 py-6">
              {tx("Checking your reset link…")}
            </p>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={26} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {tx("This reset link is no longer valid")}
              </h2>
              <p className="text-xs leading-relaxed text-slate-600">
                {tx(
                  "Reset links expire after a short time and can only be used once. Request a fresh one to continue.",
                )}
              </p>
              <Link
                href="/login?forgot=1"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {tx("Request a new link")} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {tx("New password")}
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tx("Min. 8 characters")}
                    aria-label={tx("New password")}
                    autoComplete="new-password"
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
                <ul
                  className="flex flex-wrap gap-x-4 gap-y-1 pt-1"
                  aria-live="polite"
                >
                  {rules.map((r) => {
                    const ok = r.test(password);
                    return (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1 text-[11px] font-semibold ${
                          ok ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        <CheckCircle2 size={11} />
                        {tx(r.label)}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {tx("Confirm new password")}
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={tx("Repeat your new password")}
                    aria-label={tx("Confirm new password")}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? tx("Updating…") : tx("Update password")}{" "}
                <ArrowRight size={16} />
              </button>

              <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500">
                <ShieldCheck size={12} />
                {tx("Your new password is sent over an encrypted connection.")}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
