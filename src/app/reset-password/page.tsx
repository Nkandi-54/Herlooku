"use client";

import React, { useEffect, useState } from "react";
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
import { NinjaAvatar } from "@/components/NinjaAvatar";
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-brand-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <NinjaAvatar
              className="w-14 h-14 rounded-2xl shadow-[0_0_40px_-10px_rgba(14,165,233,0.5)] group-hover:scale-105 transition-transform duration-300"
              glyphClassName="w-9 h-9"
              animated
            />
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Her
                <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                  looku
                </span>
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-0.5">
                {t("common.brandTagline")}
              </p>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white text-center">
            {tx("Choose a new password")}
          </h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            {tx("Pick something you have not used on Herlooku before.")}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-white">
                {tx("Password updated")}
              </h2>
              <p className="text-sm text-slate-400">
                {tx("Taking you to sign in…")}
              </p>
              <Link
                href="/login?reset=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500"
              >
                {tx("Continue to sign in")} <ArrowRight size={16} />
              </Link>
            </div>
          ) : checkingSession ? (
            <p className="text-center text-sm text-slate-400 py-6">
              {tx("Checking your reset link…")}
            </p>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={26} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-black text-white">
                {tx("This reset link is no longer valid")}
              </h2>
              <p className="text-xs leading-relaxed text-slate-400">
                {tx(
                  "Reset links expire after a short time and can only be used once. Request a fresh one to continue.",
                )}
              </p>
              <Link
                href="/login?forgot=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500"
              >
                {tx("Request a new link")} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={tx(showPw ? "Hide password" : "Show password")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
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
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-[0_0_25px_-8px_rgba(14,165,233,0.6)] transition-all flex items-center justify-center gap-2"
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
