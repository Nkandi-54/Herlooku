"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Calendar,
  Lock,
  Star,
  MapPin,
  Clock,
  UserCheck,
  AlertCircle,
  FileCheck,
  Edit,
  Coins,
  DollarSign,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { User, Booking, WorkerProfile } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { EmergencyAlarmModal } from "@/components/EmergencyAlarmModal";
import { useLanguage } from "@/i18n/LanguageContext";

export default function WorkerDashboardPage() {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Emergency Alarm state
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmBookingId, setAlarmBookingId] = useState("");

  const fetchData = async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      setCurrentUser(userData.activeUser);

      if (userData.activeUser) {
        const wrkRes = await fetch(`/api/workers/${userData.activeUser.id}`);
        if (wrkRes.ok) {
          const wrkData = await wrkRes.json();
          setProfile(wrkData.profile);
        }

        const bkgRes = await fetch("/api/bookings");
        if (bkgRes.ok) {
          const bkgData = await bkgRes.json();
          setBookings(bkgData.bookings || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleAuth = () => fetchData();
    window.addEventListener("auth-changed", handleAuth);
    return () => window.removeEventListener("auth-changed", handleAuth);
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">{tx("Loading worker dashboard...")}</p>
      </div>
    );
  }

  const exclusiveBookings = bookings.filter(
    (b) => b.status === "confirmed_exclusive" || b.status === "in_progress"
  );

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Avatar
            src={currentUser?.avatar}
            name={currentUser?.name || "Worker"}
            className="w-16 h-16 rounded-2xl border border-slate-200 shadow-sm"
            textClassName="text-xl"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900">{currentUser?.name}</h1>
              {currentUser && <VerificationBadge status={currentUser.idVerificationStatus} />}
            </div>
            <p className="text-xs font-semibold text-sky-700">{profile?.headline}</p>
            <p className="text-xs text-slate-400">
              {currentUser?.location} • {profile?.yearsExperience} {tx("years experience")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/worker/profile"
            className="px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800 transition-colors flex items-center gap-1.5"
          >
            <Edit size={16} />
            <span>{tx("Edit Profile & Daily Pay")}</span>
          </Link>
          {profile && (
            <Link
              href={`/workers/${currentUser?.id}`}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              {tx("Preview Public Card")}
            </Link>
          )}
        </div>
      </div>

      {/* Verification Gate Notice if worker is not yet verified */}
      {currentUser?.idVerificationStatus !== "verified" && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircle size={20} className="text-amber-600" />
            <span>{tx("Profile Hidden from Search — Verification Required")}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {tx("Your verification status is currently")} <strong>{tx(currentUser?.idVerificationStatus || "unverified")}</strong>.
            To protect households and maintain our trust guarantee, househelps can only receive
            exclusive bookings and appear in search after their government ID is approved.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/verify-id"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              {tx("Submit or Review ID Verification →")}
            </Link>
            <span className="text-[11px] text-amber-700">
              {tx("Or switch to Admin in header to approve!")}
            </span>
          </div>
        </div>
      )}

      {/* Earnings Overview Cards */}
      {/* Worker Safety & Emergency SOS Alert Banner */}
      <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-2 border-red-500/60 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
            <ShieldAlert size={26} className="text-rose-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                {tx("Worker Incident Protection")}
              </span>
              <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1">
                <Radio size={12} className="animate-ping" /> {tx("Trust & Safety Case Handling")}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              {tx("Facing Abuse, Theft or Mistreatment at a Household?")}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {tx("Your safety is our priority. If a client steals from you, abuses or mistreats you, neglects agreed duties, or breaches the engagement, report it to Herlooku Task Ninja Trust & Safety immediately.")}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setAlarmBookingId(exclusiveBookings[0]?.id || "");
            setAlarmModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all shrink-0 hover:scale-[1.02]"
        >
          <ShieldAlert size={16} />
          <span>🚨 {tx("Report Client–Worker Incident")}</span>
        </button>
      </div>

      {/* Schedule & Pay Overview Cards */}
      <div id="schedule-overview" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">
            {tx("Your Stated Daily Pay")}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-sky-700">
              {formatPrice(profile?.expectedDailySalary || 8)}
            </span>
            <span className="text-xs text-sky-900 font-bold">{tx(" / day expected")}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {tx("Paid directly to you by the household at the end of each work day. Herlooku Task Ninja does not deduct from your pay.")}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">
            {tx("Exclusively Booked Jobs")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {exclusiveBookings.length}
            </span>
            <span className="text-xs text-emerald-700 font-bold">{tx("Active Locks")}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {tx("Active household bookings where your calendar is exclusively reserved.")}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">
            {tx("Platform Rating & Trust")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500 flex items-center gap-1">
              <Star size={24} fill="currentColor" />
              <span>{profile?.rating.toFixed(1) || "5.0"}</span>
            </span>
            <span className="text-xs text-slate-500">({profile?.reviewCount || 0} {tx("reviews")})</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold">
            {tx("✓ 100% On-time attendance record")}
          </p>
        </div>
      </div>

      {/* Exclusively Locked Schedule Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Lock size={18} className="text-brand-600" />
            <span>{t("copy:Exclusively Booked Jobs ({count})", { count: exclusiveBookings.length })}</span>
          </h2>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {tx("✓ Client paid hire fee upfront")}
            {tx("✓ Web Owner Booking Fee Paid Upfront")}
          </span>
        </div>

        {exclusiveBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500">
            {tx("No upcoming exclusive bookings at this moment.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exclusiveBookings.map((bkg) => (
              <div
                key={bkg.id}
                className="bg-white rounded-2xl border-2 border-sky-400 p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-black text-sky-800">{bkg.bookingRef}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {tx("Confirmed Exclusive Job")}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{bkg.serviceName}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={13} className="text-slate-400" />
                    <span>
                      {bkg.startDate} to {bkg.endDate} ({t(bkg.totalDays === 1 ? "copy:{days} day" : "copy:{days} days", { days: bkg.totalDays })})
                    </span>
                  </div>
                </div>

                {/* Stated Pay Banner */}
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-900">
                      {tx("Expected Daily Pay:")}
                    </span>
                    <span className="text-xs font-black text-sky-800">
                      {formatPrice(profile?.expectedDailySalary || bkg.workerExpectedDailySalary || 8)}{tx(" / day expected")}
                    </span>
                  </div>
                  <p className="text-[10px] text-sky-700 leading-tight">
                    {tx("Collect directly from the client at the end of each work day. Herlooku Task Ninja does not hold or deduct from your salary.")}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span>{t("copy:Household Address: {address}", { address: bkg.clientAddress })}</span>
                  </div>
                  {bkg.specialInstructions && (
                    <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                      <strong>{tx("Household Tasks:")}</strong> {bkg.specialInstructions}
                    </p>
                  )}
                </div>

                {/* NO DIRECT PHONE / EMAIL DISPLAY */}
                <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                  <span className="font-bold text-sky-300 block text-[11px]">
                    {tx("Platform Dispatch Active")}
                  </span>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    {tx("Direct phone/email communication is disabled for safety. Herlooku Task Ninja platform dispatch coordinates your arrival.")}
                  </p>
                </div>

                {/* Emergency Alarm Trigger for Worker */}
                <button
                  type="button"
                  onClick={() => {
                    setAlarmBookingId(bkg.id);
                    setAlarmModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <ShieldAlert size={15} className="text-rose-600" />
                  <span>🚨 {tx("Report an Incident with this Household")}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Alarm SOS Modal */}
      <EmergencyAlarmModal
        isOpen={alarmModalOpen}
        onClose={() => setAlarmModalOpen(false)}
        bookings={exclusiveBookings}
        preselectedBookingId={alarmBookingId}
        userRole="worker"
        onAlarmRaised={fetchData}
      />
    </div>
  );
}
