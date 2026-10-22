"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star,
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  Lock,
  Clock,
  MapPin,
  Globe,
  AlertCircle,
  FileCheck,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  Coins,
} from "lucide-react";
import {
  WorkerProfile,
  User,
  Review,
  EngagementType,
  hiringFeeUSD,
} from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice, currency } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const workerId = params?.id as string;

  const [workerData, setWorkerData] = useState<{
    profile: WorkerProfile & { user: User };
    reviews: Review[];
    bookedDateRanges: { startDate: string; endDate: string; bookingRef: string }[];
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking selection
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [selectedEngagementType, setSelectedEngagementType] =
    useState<EngagementType>("daily");

  useEffect(() => {
    // Fetch active user
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeUser) {
          setCurrentUser(data.activeUser);
          if (data.activeUser.location) {
            setAddress(data.activeUser.location);
          }
        }
      })
      .catch(console.error);

    // Fetch worker details
    if (workerId) {
      fetch(`/api/workers/${workerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            setWorkerData(data);
            setSelectedEngagementType(
              data.profile.engagementTypes?.includes("daily") ? "daily" : "monthly",
            );
            if (data.profile.services?.length > 0) {
              setSelectedService(data.profile.services[0]);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [workerId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">{tx("Loading verified worker profile...")}</p>
      </div>
    );
  }

  if (!workerData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">{tx("Worker Profile Not Found")}</h2>
        <p className="text-sm text-slate-600">
          {tx("The requested househelp profile may have been updated or unlisted.")}
        </p>
        <Link
          href="/workers"
          className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
        >
          {tx("Return to Helper Directory")}
        </Link>
      </div>
    );
  }

  const { profile, reviews, bookedDateRanges } = workerData;

  const availableEngagements: EngagementType[] =
    profile.engagementTypes?.length > 0 ? profile.engagementTypes : ["daily"];
  const platformBookingFee = hiringFeeUSD(selectedEngagementType);
  const workerExpectedDailySalary = profile.expectedDailySalary || 8;
  const workerExpectedMonthlySalary =
    profile.expectedMonthlySalary ||
    Math.round(workerExpectedDailySalary * 26);

  let totalDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e >= s) {
      const diffTime = Math.abs(e.getTime() - s.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  const workerSalaryDueAtBooking =
    selectedEngagementType === "daily"
      ? workerExpectedDailySalary * totalDays
      : 0;
  const totalAmount = platformBookingFee + workerSalaryDueAtBooking;

  // Check if selected dates conflict with existing exclusive bookings
  const hasDateConflict = () => {
    if (!startDate || !endDate) return false;
    const reqStart = new Date(startDate).getTime();
    const reqEnd = new Date(endDate).getTime();

    for (const bkg of bookedDateRanges) {
      const bStart = new Date(bkg.startDate).getTime();
      const bEnd = new Date(bkg.endDate).getTime();
      if (reqStart <= bEnd && reqEnd >= bStart) {
        return true;
      }
    }
    return false;
  };

  const isConflict = hasDateConflict();

  const handleProceedToBooking = () => {
    setBookingError("");

    // 1. Client verification check
    if (!currentUser) {
      setBookingError(tx("Please log in to hire a househelp."));
      return;
    }

    if (currentUser.idVerificationStatus !== "verified") {
      setBookingError(tx("ID Verification Required: You must verify your ID before you can book househelps. Both parties must be ID-verified for safety."));
      return;
    }

    if (!startDate || !endDate) {
      setBookingError(tx("Please select both start and end dates."));
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setBookingError(tx("End date cannot be earlier than start date."));
      return;
    }

    if (isConflict) {
      setBookingError(tx("This worker is already exclusively booked for the chosen dates. Please pick another date range."));
      return;
    }

    if (!address) {
      setBookingError(tx("Please provide your household service address."));
      return;
    }

    // Redirect to checkout page with search params
    const query = new URLSearchParams({
      workerId,
      serviceName: selectedService,
      startDate,
      endDate,
      clientAddress: address,
      specialInstructions: instructions,
      engagementType: selectedEngagementType,
    });

    router.push(`/booking/${workerId}?${query.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">{tx("Home")}</Link>
        <span>/</span>
        <Link href="/workers" className="hover:text-slate-900">{tx("Househelps")}</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{profile.user.name}</span>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Columns: Worker Details & Background */}
        <div className="animate-fade-up lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <Avatar
                  src={profile.user.avatar}
                  name={profile.user.name}
                  className="w-24 h-24 rounded-3xl border-2 border-brand-500/30 shadow-md"
                  textClassName="text-3xl"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-slate-900">{profile.user.name}</h1>
                    <VerificationBadge status={profile.user.idVerificationStatus} />
                  </div>
                  <p className="text-sm font-semibold text-brand-700">{profile.headline}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{profile.location}</span>
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star size={14} fill="currentColor" />
                      <span>{profile.rating.toFixed(2)}</span>
                      <span className="text-slate-400 font-normal">
                        ({profile.reviewCount} reviews)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right bg-sky-50/80 p-4 rounded-2xl border border-sky-100 shrink-0 w-full sm:w-auto">
                <div className="text-[11px] text-sky-800 font-bold uppercase">{tx("Platform Hiring Fee")}</div>
                <div className="text-2xl font-black text-slate-900">
                  {formatPrice(platformBookingFee)}
                </div>
                <div className="text-[11px] text-slate-500">{tx("to lock helper exclusively")}</div>
                <div className="text-[11px] text-sky-900 font-bold mt-1 pt-1 border-t border-sky-200">
                  {availableEngagements.includes("daily") && (
                    <span className="block">{tx("Daily hiring fee")}: {formatPrice(hiringFeeUSD("daily"))}</span>
                  )}
                  {availableEngagements.includes("monthly") && (
                    <span className="block">
                      {tx("Monthly hiring fee")}: {formatPrice(hiringFeeUSD("monthly"))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vetted Credentials Checklist */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">{tx("Government ID Verified")}</span>
              </div>
              <div className="flex items-center gap-2 bg-sky-50 text-sky-800 p-2.5 rounded-xl border border-sky-100">
                <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                <span className="font-semibold">{tx("Background Cleared")}</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-800 p-2.5 rounded-xl border border-blue-100">
                <Award size={16} className="text-blue-600 shrink-0" />
                <span className="font-semibold">{t("copy:{count} Verified References", { count: profile.referenceCount })}</span>
              </div>
            </div>
          </div>

          {/* Privacy & No-Contact Notice */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <Lock size={22} className="text-sky-400 shrink-0 mt-1" />
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-sky-300 text-sm">{tx("Off-Platform Communication Prohibited")}</h3>
              <p className="text-slate-300 leading-relaxed">
                {tx("To prevent bypass scams and ensure guaranteed exclusive scheduling, direct phone and messaging channels between clients and domestic workers are disabled. All booking arrival details and special household notes are coordinated through the platform.")}
              </p>
            </div>
          </div>

          {/* About & Bio */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t("copy:About {name}", { name: profile.user.name })}</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">{tx("Engagement")}</span>
                <span className="font-bold text-slate-800 capitalize">
                  {(profile.engagementTypes || []).length > 0
                    ? (profile.engagementTypes || []).map(tx).join(" & ")
                    : tx("Daily")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Experience")}</span>
                <span className="font-bold text-slate-800">{profile.yearsExperience} {tx("Years")}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Languages")}</span>
                <span className="font-bold text-slate-800">
                  {profile.languages.join(", ")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Service Radius")}</span>
                <span className="font-bold text-slate-800">{profile.serviceRadiusKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Live-In Setup")}</span>
                <span className="font-bold text-slate-800">
                  {tx(profile.liveInAvailable ? "Available" : "Day-Shift Only")}
                </span>
              </div>
            </div>
          </div>

          {/* Skills & Specialties */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{tx("Verified Skills & Tasks")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <CheckCircle2 size={16} className="text-brand-600 shrink-0" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Exclusive Bookings Calendar Notice */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-brand-600" />
                <span>{tx("Exclusive Schedule & Blocked Dates")}</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {tx("Locked dates cannot be double-booked")}
              </span>
            </div>

            {bookedDateRanges.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  {tx("The following dates are currently exclusively locked for other households:")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {bookedDateRanges.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar size={14} className="text-rose-500" />
                        <span>
                          {b.startDate} to {b.endDate}
                        </span>
                      </span>
                      <span className="text-[10px] bg-rose-200/80 px-2 py-0.5 rounded-full font-bold uppercase">
                        {tx("Locked")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                {tx("✓ No active locks. This worker is open for immediate exclusive hire!")}
              </p>
            )}
          </div>

          {/* Client Reviews */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {t("copy:Verified Client Reviews ({count})", { count: reviews.length })}
              </h2>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                <Star size={16} fill="currentColor" />
                <span>{profile.rating.toFixed(2)} / 5.0</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500">{tx("No reviews yet for this worker.")}</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.clientAvatar}
                          alt={rev.clientName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {rev.clientName}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={10} /> {tx("Verified Hire")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} size={12} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 block">{rev.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Exclusive Hire & Pay-First Widget */}
        <div className="lg:col-span-1">
          <div className="card ring-conic p-6 space-y-6 sticky top-24 border-2 border-brand-500/25">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Lock size={12} />
                <span>{tx("Exclusive Upfront Hire Fee")}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{t("copy:Book {name}", { name: profile.user.name })}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {t("copy:Pay Herlooku upfront to lock {name} for your home.", { name: profile.user.name })}
              </p>
            </div>

            {/* Client ID status reminder */}
            {currentUser && (
              <div
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  currentUser.idVerificationStatus === "verified"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {currentUser.idVerificationStatus === "verified" ? (
                    <>
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>{tx("You are ID Verified ✓")}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={16} className="text-amber-600" />
                      <span>{tx("ID Verification Required")}</span>
                    </>
                  )}
                </div>
                {currentUser.idVerificationStatus !== "verified" && (
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    You must{" "}
                    <Link href="/verify-id" className="underline font-bold">
                      {tx("submit your ID")}
                    </Link>{" "}
                    {tx("You must submit your ID before you can pay and book.")}
                  </p>
                )}
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">{tx("Service Specialty")}</label>
              <select
                value={selectedService}
                aria-label={tx("Service Specialty")}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {profile.services.map((svc) => (
                  <option key={svc} value={svc}>
                    {tx(svc)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">{tx("Start Date")}</label>
                <input
                  type="date"
                  value={startDate}
                  aria-label={tx("Start Date")}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">{tx("End Date")}</label>
                <input
                  type="date"
                  value={endDate}
                  aria-label={tx("End Date")}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Date conflict alert */}
            {isConflict && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                <span>
                  {tx("Dates overlap with an existing exclusive booking. Please select different dates.")}
                </span>
              </div>
            )}

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">{tx("Household Service Address")}</label>
              <input
                type="text"
                placeholder={tx("Street address, Apt, City...")}
                aria-label={tx("Household Service Address")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Special Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                {tx("Special Tasks / Household Notes (Optional)")}
              </label>
              <textarea
                rows={2}
                placeholder={tx("e.g. Allergies, pets in house, priority chores...")}
                aria-label={tx("Special Tasks / Household Notes (Optional)")}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {availableEngagements.length > 1 && (
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-slate-800">
                  {tx("Choose engagement type")}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {availableEngagements.map((engagement) => (
                    <label
                      key={engagement}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs ${
                        selectedEngagementType === engagement
                          ? "border-brand-500 bg-brand-50 text-brand-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <span>
                        {engagement === "daily" ? tx("Daily hire") : tx("Monthly hire")}
                        {" · "}
                        {formatPrice(hiringFeeUSD(engagement))}
                      </span>
                      <input
                        type="radio"
                        name="engagementType"
                        value={engagement}
                        checked={selectedEngagementType === engagement}
                        onChange={() => setSelectedEngagementType(engagement)}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Pricing Breakdown: Web Owner Fee & Expected Daily Pay */}
            {!isConflict && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{tx("Platform Hiring Fee")}</span>
                  <span className="font-semibold text-slate-900">{formatPrice(platformBookingFee)}</span>
                </div>
                {selectedEngagementType === "daily" ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>{tx("Daily worker pay held by Herlooku")}</span>
                      <span className="font-semibold text-sky-800">
                        {formatPrice(workerExpectedDailySalary)} × {totalDays} {tx("days")}
                      </span>
                    </div>
                    <div className="text-[10px] text-sky-800">
                      {tx("Herlooku pays the worker after the task is completed.")}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>{tx("Expected monthly pay paid directly to worker")}</span>
                    <span className="font-semibold text-sky-800">
                      {formatPrice(workerExpectedMonthlySalary)} / {tx("month")}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>{tx("Due Online Now")}</span>
                  <span className="text-brand-700 font-black">{formatPrice(totalAmount)}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 leading-tight">
                  {selectedEngagementType === "daily"
                    ? tx("Pay the daily hiring fee and the booked daily wages to Herlooku at booking. Herlooku pays the worker after the task is completed.")
                    : tx("Pay the monthly hiring fee to Herlooku at booking. Pay the worker’s monthly salary directly to them.")}
                </div>
              </div>
            )}

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle size={14} />
                  <span>{tx("Notice")}</span>
                </div>
                <p>{bookingError}</p>
                {bookingError.includes("ID Verification Required") && (
                  <Link
                    href="/verify-id"
                    className="inline-block mt-1 font-bold underline text-brand-700"
                  >
                    {tx("Go to ID Verification page →")}
                  </Link>
                )}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleProceedToBooking}
              disabled={isConflict}
              className={`btn w-full py-4 text-sm ${
                isConflict
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "btn-primary"
              }`}
            >
              <CreditCard size={18} />
              <span>{t("copy:Pay {amount} to Herlooku", { amount: formatPrice(totalAmount) })}</span>
            </button>

            <div className="text-center text-[11px] text-slate-400 space-y-1.5">
              <p className="flex items-center justify-center gap-1.5">
                <Lock size={12} className="text-brand-500" />
                <span>{tx("Calendar locked exclusively upon payment")}</span>
              </p>
              <p className="text-emerald-700 font-bold flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} />
                <span>{tx("Both parties ID-verified")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
