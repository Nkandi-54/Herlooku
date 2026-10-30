"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
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
} from "lucide-react";
import { NinjaAvatar } from "@/components/NinjaAvatar";
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <NinjaAvatar
              className="w-14 h-14 rounded-2xl shadow-[0_0_40px_-10px_rgba(14,165,233,0.6)] group-hover:scale-105 transition-transform duration-300"
              glyphClassName="w-9 h-9"
              animated
            />
            <div>
              <span className="text-2xl font-black tracking-tight text-white whitespace-nowrap">Her<span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">looku</span></span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-0.5">
                {t("common.brandTagline")}
              </p>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white text-center">
            {tx("Welcome back")}
          </h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            {tx("Sign in to your Herlooku account")}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Confirmed Notice */}
            {isConfirmed && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>
                  {tx(
                    "Your email has been confirmed! Please sign in to access your dashboard.",
                  )}
                </span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {tx("Password")}
                </label>
                <span className="text-[11px] text-brand-400 font-semibold">
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
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/50 transition-all"
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
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-[0_0_25px_-8px_rgba(14,165,233,0.6)] hover:shadow-[0_0_35px_-8px_rgba(14,165,233,0.8)] transition-all flex items-center justify-center gap-2 mt-2"
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
              className="text-brand-400 font-bold hover:text-brand-300 transition-colors"
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
