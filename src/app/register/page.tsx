"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Mail, Lock, User, Phone, MapPin,
  Briefcase, Home, ArrowRight, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { NinjaAvatar } from "@/components/NinjaAvatar";
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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(tx("Please enter your full name."));
    if (!form.email.trim()) return setError(tx("Please enter your email address."));
    if (form.password.length < 6) return setError(tx("Password must be at least 6 characters."));
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">{tx("Account Created!")}</h2>
          <p className="text-slate-400 text-sm">
            {t("copy:Welcome to Herlooku, {name}! Redirecting to your dashboard…", { name: form.name })}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 mt-2">
            <ShieldCheck size={12} />
            <span>{tx("Please complete ID verification to unlock all features")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] rounded-full bg-brand-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-6">
            <NinjaAvatar
              className="w-14 h-14 rounded-2xl shadow-[0_0_40px_-10px_rgba(14,165,233,0.5)] group-hover:scale-105 transition-transform duration-300"
              glyphClassName="w-9 h-9"
              animated
            />
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Her<span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">looku</span>
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-0.5">
                {t("common.brandTagline")}
              </p>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white text-center">{tx("Create your account")}</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">{tx("Join thousands of verified Kenyans on Herlooku")}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  step >= s ? "bg-brand-500 w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">

          {/* ── Step 1: Role + credentials ─────── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{tx("Step 1 of 2 — Account basics")}</p>

              {/* Role selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("I am joining as")}</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["client", "worker"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                        role === r
                          ? "border-brand-500 bg-brand-500/15 text-white"
                          : "border-white/10 bg-slate-800/40 text-slate-400 hover:border-white/25"
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
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Full Name")}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set("name")}
                    placeholder={tx("Your legal full name")}
                    aria-label={tx("Full Name")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Email Address")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@example.com"
                    aria-label={tx("Email Address")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Password")}</label>
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
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={tx(showPw ? "Hide password" : "Show password")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Confirm Password")}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder={tx("Repeat your password")}
                    aria-label={tx("Confirm Password")}
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
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-sm tracking-wide shadow-[0_0_25px_-8px_rgba(14,165,233,0.6)] hover:shadow-[0_0_35px_-8px_rgba(14,165,233,0.8)] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {tx("Continue")} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* ── Step 2: Contact + extras ────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{tx("Step 2 of 2 — Your details")}</p>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-brand-400 font-bold hover:text-brand-300 transition-colors">
                  {tx("← Back")}
                </button>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Phone Number")}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+254 7XX XXX XXX"
                    aria-label={tx("Phone Number")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Location / Area")}</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={set("location")}
                    placeholder={tx("e.g. Westlands, Nairobi")}
                    aria-label={tx("Location / Area")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Worker-only fields */}
              {role === "worker" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tx("Professional Headline")}</label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={set("headline")}
                      placeholder={tx("e.g. Professional Nanny & Cook")}
                      aria-label={tx("Professional Headline")}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {tx("Expected Daily Pay")} <span className="normal-case font-normal text-slate-500">{tx("(Ksh, paid by client at end of day)")}</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={form.expectedDailySalary}
                      onChange={set("expectedDailySalary")}
                      placeholder="e.g. 1200"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition-all"
                    />
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      This is your direct pay settled offline with the client. Herlooku only charges the Ksh 3,000 platform booking fee.
                    </p>
                  </div>
                </>
              )}

              {/* Notice */}
              <div className="p-3 bg-brand-500/8 border border-brand-500/20 rounded-xl flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-brand-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {tx("After registering, you’ll need to complete ID Verification (government-issued ID + selfie) before booking or being booked.")}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-[0_0_25px_-8px_rgba(14,165,233,0.6)] hover:shadow-[0_0_35px_-8px_rgba(14,165,233,0.8)] transition-all flex items-center justify-center gap-2 mt-2"
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
          <Link href="/login" className="text-brand-400 font-bold hover:text-brand-300 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
