"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Mail, Lock, User, Phone, MapPin,
  Briefcase, Home, ArrowRight, ShieldCheck, CheckCircle2, MailCheck, AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

type Role = "client" | "worker";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("client");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    location: "",
    // Worker extras
    headline: "",
    expectedDailySalary: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(tx("Please enter your full name."));
    if (!form.email.trim()) return setError(tx("Please enter your email address."));
    if (form.password.length < 8) return setError(tx("Choose a password with at least 8 characters."));
    if (form.password !== form.confirmPassword) return setError(tx("Passwords do not match."));
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.phone.trim()) return setError(tx("Phone number is required."));
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          role,
          location: form.location.trim() || "Kenya",
          headline: form.headline.trim() || undefined,
          expectedDailySalary: form.expectedDailySalary
            ? parseFloat(form.expectedDailySalary)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`copy:${data.error || "Registration failed. Please try again."}`));
        return;
      }
      if (data.requiresEmailConfirmation) {
        setConfirmationMessage(
          tx(
            "Check your inbox to confirm your email address. An administrator will review your account after that.",
          ),
        );
        setSuccess(true);
        return;
      }
      setSuccess(true);
      window.dispatchEvent(new Event("auth-changed"));
      setTimeout(() => {
        const r = data.activeUser?.role;
        router.push(r === "worker" ? "/dashboard/worker" : "/dashboard/client");
      }, 1800);
    } catch {
      setError(tx("Network error. Please check your connection."));
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ───────────────────────── */
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-700" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{tx("Account Created!")}</h2>
          <p className="text-slate-600 text-sm">
            {confirmationMessage ||
              t("copy:Welcome to Herlooku, {name}! Redirecting to your dashboard…", { name: form.name })}
          </p>
          {confirmationMessage ? (
            <>
              <div
                role="note"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-[11px] font-semibold leading-relaxed text-amber-900"
              >
                {tx(
                  "You cannot sign in until this email is confirmed. Open the link now — it only takes a moment.",
                )}
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
              >
                {tx("Continue to sign in")} <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 mt-2">
              <ShieldCheck size={12} />
              <span>{tx("Please complete ID verification to unlock all features")}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
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
          <h1 className="text-2xl font-bold text-slate-900 text-center">{tx("Create your account")}</h1>
          <p className="text-sm text-slate-600 mt-1 text-center">{tx("Create an account to find or offer household services.")}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  step >= s ? "bg-brand-700 w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Email confirmation warning — shown before signup, not after */}
        <div
          role="note"
          aria-label={tx("Confirm your email straight after signing up")}
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
              <MailCheck size={16} />
            </span>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {tx("Confirm your email straight after signing up")}
              </p>
              <p className="text-[12px] leading-relaxed text-amber-900">
                {tx(
                  "We send a confirmation link the moment your account is created. Open it immediately — until your email is confirmed you cannot sign in or use Herlooku.",
                )}
              </p>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                <span>
                  {tx(
                    "Can’t find the email? Check your spam or promotions folder, then request a new link from the sign-in page.",
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">

          {/* ── Step 1: Role + credentials ─────── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">{tx("Step 1 of 2 — Account basics")}</p>

              {/* Role selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("I am joining as")}</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["client", "worker"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                        role === r
                          ? "border-brand-600 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {r === "client" ? <Home size={22} /> : <Briefcase size={22} />}
                      <span className="text-sm font-black capitalize">{t(`roles.${r}`)}</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">
                        {r === "client" ? tx("I need a househelp") : tx("I offer services")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Full Name")}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder={tx("Your legal full name")}
                    aria-label={tx("Full Name")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Email Address")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Password")}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={set("password")}
                    placeholder={tx("Min. 6 characters")}
                    aria-label={tx("Password")}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={tx(showPw ? "Hide password" : "Show password")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Confirm Password")}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder={tx("Repeat your password")}
                    aria-label={tx("Confirm Password")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {tx("Continue")} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* ── Step 2: Contact + extras ────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{tx("Step 2 of 2 — Your details")}</p>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-brand-800 font-semibold hover:text-brand-900 transition-colors">
                  {tx("← Back")}
                </button>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Phone Number")}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+254 7XX XXX XXX"
                    aria-label={tx("Phone Number")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Location / Area")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={set("location")}
                    placeholder={tx("e.g. Westlands, Nairobi")}
                    aria-label={tx("Location / Area")}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                  />
                </div>
              </div>

              {/* Worker-only fields */}
              {role === "worker" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{tx("Professional Headline")}</label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={set("headline")}
                      placeholder={tx("e.g. Professional Nanny & Cook")}
                      aria-label={tx("Professional Headline")}
                      className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {tx("Expected Daily Pay")} <span className="normal-case font-normal text-slate-500">{tx("(Ksh, paid by Herlooku after task completion)")}</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={50}
                      value={form.expectedDailySalary}
                      onChange={set("expectedDailySalary")}
                      placeholder="e.g. 1200"
                      className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      For daily hires, clients pay Herlooku and Herlooku pays you after the task is completed. Monthly employers pay workers directly.
                    </p>
                  </div>
                </>
              )}

              {/* Notice */}
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-brand-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {tx("After registering, you’ll need to complete ID Verification (government-issued ID + selfie) before booking or being booked.")}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account…
                  </>
                ) : (
                  <>
                    Create My Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-800 font-semibold hover:text-brand-900 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
