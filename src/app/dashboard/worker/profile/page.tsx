"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User as UserIcon,
  MapPin,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Save,
  Award,
  Globe,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { User, WorkerProfile } from "@/types";
import type { EngagementType } from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { AvatarUpload } from "@/components/AvatarUpload";

const ALL_SERVICES = [
  "Childcare",
  "Cooking",
  "Housekeeping",
  "Deep Cleaning",
  "Elderly Care",
  "Laundry",
  "Organization",
  "Yard Care",
  "Refrigerator Repair",
  "Microwave Repair",
  "Appliance Repair",
  "Mechanical Repairs",
  "Automotive Repair",
  "Plumbing",
  "Electrical Repairs",
  "Carpentry",
  "Painting",
  "Air Conditioning Repair",
  "General Repairs",
];

export default function WorkerProfilePage() {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const { currency, exchangeRate, formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [dailySalaryKsh, setDailySalaryKsh] = useState<number>(1040);
  const [monthlySalaryKsh, setMonthlySalaryKsh] = useState<number>(20000);
  const [engagementTypes, setEngagementTypes] = useState<EngagementType[]>(["daily", "monthly"]);
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [services, setServices] = useState<string[]>(["Housekeeping"]);
  const [languages, setLanguages] = useState<string>("English, Swahili");
  const [skills, setSkills] = useState<string>("Deep Cleaning, Organization");
  const [liveInAvailable, setLiveInAvailable] = useState<boolean>(false);
  const [avatar, setAvatar] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setName(data.user.name || "");
          setLocation(data.user.location || "");
          setAvatar(data.user.avatar || "");
        }
        if (data.workerProfile) {
          const wp = data.workerProfile;
          setHeadline(wp.headline || "");
          setBio(wp.bio || "");
          setDailySalaryKsh(Math.round((wp.expectedDailySalary || 8) * exchangeRate));
          setMonthlySalaryKsh(Math.round((wp.expectedMonthlySalary || 160) * exchangeRate));
          setEngagementTypes(
            wp.engagementTypes && wp.engagementTypes.length > 0
              ? wp.engagementTypes
              : ["daily", "monthly"]
          );
          setYearsExperience(wp.yearsExperience || 2);
          setServices(wp.services || ["Housekeeping"]);
          setLanguages(wp.languages ? wp.languages.join(", ") : "English, Swahili");
          setSkills(wp.skills ? wp.skills.join(", ") : "");
          setLiveInAvailable(!!wp.liveInAvailable);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [exchangeRate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /** Instantly persist avatar changes (upload/remove) without waiting for form save. */
  const persistAvatar = async (url: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("auth-changed"));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleService = (svc: string) => {
    if (services.includes(svc)) {
      setServices(services.filter((s) => s !== svc));
    } else {
      setServices([...services, svc]);
    }
  };

  const handleToggleEngagementType = (t: EngagementType) => {
    if (engagementTypes.includes(t)) {
      setEngagementTypes(engagementTypes.filter((x) => x !== t));
    } else {
      setEngagementTypes([...engagementTypes, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    // Convert daily salary back to base USD for database
    const salaryInUsd = Number((dailySalaryKsh / exchangeRate).toFixed(2));
    const monthlySalaryInUsd = Number((monthlySalaryKsh / exchangeRate).toFixed(2));

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          headline,
          bio,
          expectedDailySalary: salaryInUsd,
          expectedMonthlySalary: monthlySalaryInUsd,
          engagementTypes,
          yearsExperience,
          services,
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          liveInAvailable,
          avatar,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        window.dispatchEvent(new Event("auth-changed"));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">{tx("Loading worker profile & stated daily salary...")}</p>
      </div>
    );
  }

  const calculatedUsd = Number((dailySalaryKsh / exchangeRate).toFixed(2));
  const calculatedMonthlyUsd = Number((monthlySalaryKsh / exchangeRate).toFixed(2));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{tx("Edit Worker Profile & Expected Pay")}</h1>
        <p className="text-xs text-slate-500 mt-1">
          {tx("Update your public profile, service specialties, and expected pay for your selected engagement types.")}
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{tx("Worker profile and expected pay updated successfully!")}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* Profile Photo Upload */}
        <div className="pb-1 border-b border-slate-100">
          <AvatarUpload
            value={avatar}
            name={name}
            size={88}
            label={tx("Worker Profile Photo")}
            onChange={setAvatar}
            onPersist={persistAvatar}
          />
        </div>

        {/* Basic Identification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Full Name")}</label>
            <input
              type="text"
              required
              aria-label={tx("Full Name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Location / Service Region")}</label>
            <input
              type="text"
              required
              aria-label={tx("Location / Service Region")}
              placeholder={tx("e.g. Nairobi Metro & Suburbs")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Professional Headline */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">{tx("Professional Headline")}</label>
          <input
            type="text"
            required
            aria-label={tx("Professional Headline")}
            placeholder={tx("e.g. Professional Nanny & Certified Chef / Cook")}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Engagement Types & Expected Pay Box */}
        <div className="p-5 bg-sky-50/70 border-2 border-sky-300 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-sky-950 flex items-center gap-1.5">
              <Coins size={16} className="text-sky-700" />
              <span>{tx("Work Availability & Expected Pay")}</span>
            </label>
            <span className="text-[11px] text-sky-800 font-semibold">
              {tx("Daily pay is handled by Herlooku; monthly pay is paid directly by your employer.")}
            </span>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
            <span className="font-bold block">{tx("Your Pay Guarantee:")}</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>{tx("Your stated salary is not reduced by a worker commission.")}</strong>{" "}
              {tx("Select daily jobs, monthly work, or both and set your expected pay. Herlooku collects daily wages and pays you after task completion; monthly wages come directly from your employer.")}
            </p>
          </div>

          {/* Engagement type toggles */}
          <div className="grid grid-cols-2 gap-2">
            {(["daily", "monthly"] as EngagementType[]).map((t) => (
              <label
                key={t}
                className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-2 capitalize ${
                  engagementTypes.includes(t)
                    ? "bg-sky-500 border-sky-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={engagementTypes.includes(t)}
                  onChange={() => handleToggleEngagementType(t)}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>{tx(t === "daily" ? "Daily / Short-Term Jobs" : "Monthly / Long-Term Work")}</span>
              </label>
            ))}
          </div>

          {/* Daily pay — only shown when daily is selected */}
          {engagementTypes.includes("daily") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">
                  {tx("Expected Daily Pay in Ksh (KES)")}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="200"
                    step="50"
                    aria-label={tx("Expected Daily Pay in Ksh (KES)")}
                    value={dailySalaryKsh}
                    onChange={(e) => setDailySalaryKsh(Number(e.target.value))}
                    className="w-full text-sm font-black bg-white border border-sky-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">{tx("Ksh / day")}</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-200 text-xs text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {tx("Currency Conversion Preview")}
                </span>
                <span className="text-base font-black text-sky-700">
                  {t("copy:Ksh {salary} / day ≈ ${usd} USD / day", { salary: dailySalaryKsh.toLocaleString(), usd: calculatedUsd })}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t("copy:Exchange rate: 1 USD = {rate} Ksh. Herlooku pays you after task completion.", { rate: exchangeRate })}
                </p>
              </div>
            </div>
          )}

          {/* Monthly pay — only shown when monthly is selected */}
          {engagementTypes.includes("monthly") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">
                  {tx("Expected Monthly Pay in Ksh (KES)")}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="5000"
                    step="500"
                    aria-label={tx("Expected Monthly Pay in Ksh (KES)")}
                    value={monthlySalaryKsh}
                    onChange={(e) => setMonthlySalaryKsh(Number(e.target.value))}
                    className="w-full text-sm font-black bg-white border border-sky-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">{tx("Ksh / month")}</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-200 text-xs text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {tx("Currency Conversion Preview")}
                </span>
                <span className="text-base font-black text-sky-700">
                  {t("copy:Ksh {salary} / month ≈ ${usd} USD / month", { salary: monthlySalaryKsh.toLocaleString(), usd: calculatedMonthlyUsd })}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t("copy:Exchange rate: 1 USD = {rate} Ksh. Paid by household monthly as agreed.", { rate: exchangeRate })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">{tx("Professional Bio & Experience")}</label>
          <textarea
            rows={4}
            required
            aria-label={tx("Professional Bio & Experience")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </div>

        {/* Services Offered Checkboxes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            {tx("Services & Specializations")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_SERVICES.map((svc) => (
              <label
                key={svc}
                className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                  services.includes(svc)
                    ? "bg-sky-50 border-sky-400 text-sky-900 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={tx(svc)}
                  checked={services.includes(svc)}
                  onChange={() => handleToggleService(svc)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                />
                <span>{t(`copy:${svc}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Experience, Languages & Live-In */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{tx("Years of Experience")}</label>
            <input
              type="number"
              min="0"
              max="40"
              aria-label={tx("Years of Experience")}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">{tx("Spoken Languages")}</label>
            <input
              type="text"
              aria-label={tx("Spoken Languages")}
              placeholder={tx("e.g. English, Swahili, French")}
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3"
            />
          </div>
        </div>

        {/* Skills Tag string */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            {tx("Specific Skills & Strengths (comma-separated)")}
          </label>
          <input
            type="text"
            aria-label={tx("Specific Skills & Strengths (comma-separated)")}
            placeholder={tx("e.g. Pediatric Care, Gourmet Cooking, Delicate Fabric Laundry, CPR Certified")}
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3"
          />
        </div>

        {/* Live-in Option */}
        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              aria-label={tx("Open to Live-In Arrangements")}
              checked={liveInAvailable}
              onChange={(e) => setLiveInAvailable(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <span>{tx("Open to Live-In Arrangements")}</span>
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Save size={15} />
            <span>{tx(saving ? "Saving Changes..." : "Save Worker Profile & Expected Pay")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
