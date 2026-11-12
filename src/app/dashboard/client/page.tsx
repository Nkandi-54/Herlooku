"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Calendar,
  Lock,
  Star,
  MapPin,
  Receipt,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Coins,
  Shield,
  User as UserIcon,
  ShieldAlert,
  Radio,
  AlertTriangle,
} from "lucide-react";
import { User, Booking, WorkerProfile, hiringFeeUSD } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { EmergencyAlarmModal } from "@/components/EmergencyAlarmModal";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ClientDashboardPage() {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workersMap, setWorkersMap] = useState<Record<string, WorkerProfile & { user: User }>>({});
  const [loading, setLoading] = useState(true);

  // Emergency Alarm state
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmBookingId, setAlarmBookingId] = useState("");

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Get current user
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      setCurrentUser(userData.activeUser);

      // 2. Get bookings
      const bkgRes = await fetch("/api/bookings");
      const bkgData = await bkgRes.json();
      setBookings(bkgData.bookings || []);

      // 3. Get workers for metadata lookup
      const wrkRes = await fetch("/api/workers?includeUnverified=true");
      const wrkData = await wrkRes.json();
      const map: Record<string, any> = {};
      wrkData.profiles?.forEach((p: any) => {
        map[p.userId] = p;
      });
      setWorkersMap(map);
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

  const handleOpenReview = (bkg: Booking) => {
    setReviewBooking(bkg);
    setReviewRating(5);
    setReviewComment("");
    setReviewSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: reviewBooking.id,
          workerId: reviewBooking.workerId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (res.ok) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewBooking(null);
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">{tx("Loading your household hires...")}</p>
      </div>
    );
  }

  const pendingPaymentBookings = bookings.filter(
    (b) => b.status === "pending_payment"
  );
  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed_exclusive" || b.status === "in_progress"
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  return (
    <div className="space-y-8">
      {/* Client Welcome Hero — distinct from worker dashboard */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-[2rem] p-6 sm:p-8 text-white shadow-card animate-fade-up">
        <div aria-hidden className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-20 right-1/4 w-40 h-40 rounded-full bg-brand-300/20 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar
              src={currentUser?.avatar}
              name={currentUser?.name || "Client"}
              className="w-16 h-16 rounded-2xl border-2 border-white/40 shadow-md"
              textClassName="text-xl"
            />
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-100 bg-white/15 px-2.5 py-0.5 rounded-full inline-block">
                {tx("Household Client Portal")}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black">{t("copy:Welcome back, {name}", { name: currentUser?.name?.split(" ")[0] || "" })}</h1>
                {currentUser && <VerificationBadge status={currentUser.idVerificationStatus} />}
              </div>
              <p className="text-xs text-brand-100 flex items-center gap-1.5">
                <MapPin size={12} />
                <span>{currentUser?.location}</span>
                {currentUser?.householdSize && (
                  <span className="font-semibold">• {t("copy:Household of {count}", { count: currentUser.householdSize })}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/client/profile"
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-bold transition-colors flex items-center gap-1.5 backdrop-blur-sm"
            >
              <UserIcon size={16} />
              <span>{tx("Edit Profile")}</span>
            </Link>
            <Link
              href="/workers"
              className="px-4 py-2.5 rounded-xl bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
            >
              <PlusCircle size={16} />
              <span>{tx("Hire New Helper")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Client Quick Stats — unique to client side */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card p-5 flex items-center gap-4 hover:shadow-card transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{activeBookings.length}</span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{tx("Active Exclusive Hires")}</span>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 hover:shadow-card transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{pastBookings.length}</span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{tx("Completed Hires")}</span>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 hover:shadow-card transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">
              {formatPrice(
                bookings.reduce(
                  (sum, b) => sum + (b.platformBookingFee || b.totalAmount || 0),
                  0
                )
              )}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{tx("Total Hire Fees Paid")}</span>
          </div>
        </div>
      </div>

      {/* ID Verification Warning Banner if not verified */}
      {currentUser?.idVerificationStatus !== "verified" && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Action Required: Complete Identity Verification
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Your ID verification status is currently <strong>{currentUser?.idVerificationStatus}</strong>.
                You must be verified before hiring or locking any worker exclusively.
              </p>
            </div>
          </div>
          <Link
            href="/verify-id"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Verify ID Now
          </Link>
        </div>
      )}

      {/* Emergency Alarm SOS Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-red-950 to-slate-950 border-2 border-rose-600/60 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
            <ShieldAlert size={26} className="text-rose-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                Incident Response
              </span>
              <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1">
                <Radio size={12} /> Trust & Safety Case Handling
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Househelp Stole, Abused or Mistreated Someone?
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              If your househelp steals, abuses or mistreats a household member, neglects agreed duties, or breaches the engagement, raise a high-priority incident report with detailed information.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setAlarmBookingId(activeBookings[0]?.id || "");
            setAlarmModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all shrink-0 hover:scale-[1.02]"
        >
          <ShieldAlert size={16} />
          <span>🚨 {tx("Report Client–Worker Incident")}</span>
        </button>
      </div>

      {/* Pending M-PESA Till Payments Section */}
      {pendingPaymentBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <span>{t("copy:Pending M-PESA Till Verification ({count})", { count: pendingPaymentBookings.length })}</span>
            </h2>
            <span className="text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Payment Required to Lock Worker
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingPaymentBookings.map((bkg) => {
              const worker = workersMap[bkg.workerId];
              return (
                <div
                  key={bkg.id}
                  className="bg-amber-50/40 rounded-3xl border-2 border-amber-300 overflow-hidden shadow-soft p-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                    <span className="text-xs font-black text-amber-900">{bkg.bookingRef}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      <Clock size={12} /> Pending Till Payment
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar
                      src={worker?.user.avatar}
                      name={worker?.user.name || "Assigned Househelp"}
                      className="w-12 h-12 rounded-xl border border-amber-200"
                      textClassName="text-base"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {worker?.user.name || "Assigned Househelp"}
                      </h3>
                      <p className="text-xs text-amber-700 font-semibold">{bkg.serviceName}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl text-xs space-y-1 border border-amber-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{tx("Dates Requested:")}</span>
                      <span className="font-bold text-slate-800">{bkg.startDate} to {bkg.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{tx("Platform Placement Fee:")}</span>
                      <span className="font-bold text-brand-700">
                        {bkg.paymentMethod === "admin_manual"
                          ? tx("Not collected")
                          : formatPrice(bkg.platformBookingFee || hiringFeeUSD(bkg.engagementType))}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-100/70 rounded-xl text-[11px] text-amber-900 space-y-1">
                    <p className="font-bold">{tx("Instructions to dispatch helper:")}</p>
                    <p>
                      {bkg.paymentMethod === "admin_manual"
                        ? tx("This assignment was confirmed by an administrator. No fee or wages were collected by Herlooku; agree payment directly with the worker.")
                        : bkg.engagementType === "daily"
                        ? "Daily wages are paid to Herlooku at booking and paid out to the worker after task completion."
                        : "Pay the monthly worker directly; the M-Pesa hiring fee is paid to Herlooku."}
                    </p>
                  </div>

                  <Link
                    href={`/booking/${bkg.workerId}?startDate=${bkg.startDate}&endDate=${bkg.endDate}&clientAddress=${encodeURIComponent(bkg.clientAddress || "")}&serviceName=${encodeURIComponent(bkg.serviceName || "")}&engagementType=${bkg.engagementType}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <span>{tx("Complete Till Payment / Verify Code →")}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Exclusive Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Lock size={18} className="text-brand-600" />
            <span>{t("copy:Active Exclusive Hires ({count})", { count: activeBookings.length })}</span>
          </h2>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Worker Calendar Locked
          </span>
        </div>

        {activeBookings.length === 0 ? (
          <div className="card p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-brand-50 rounded-3xl flex items-center justify-center text-brand-500 mx-auto">
              <Calendar size={26} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">{tx("No active hires right now")}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Browse vetted househelps. Daily bookings include wages paid to Herlooku for payout after task completion; monthly wages are paid directly to workers.
            </p>
            <Link
              href="/workers"
              className="inline-block px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl"
            >
              Browse Helpers
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBookings.map((bkg) => {
              const worker = workersMap[bkg.workerId];
              return (
                <div
                  key={bkg.id}
                  className="bg-white rounded-3xl border border-brand-200/80 border-l-4 border-l-brand-500 overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 space-y-4 p-6"
                >
                  {/* Top: Booking ref & Status pill */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black text-brand-700">{bkg.bookingRef}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <Lock size={12} /> Exclusively Locked
                    </span>
                  </div>

                  {/* Worker & Service */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={worker?.user.avatar}
                      name={worker?.user.name || "Assigned Househelp"}
                      className="w-12 h-12 rounded-xl border border-slate-200"
                      textClassName="text-base"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {worker?.user.name || "Assigned Househelp"}
                      </h3>
                      <p className="text-xs text-brand-600 font-semibold">{bkg.serviceName}</p>
                    </div>
                  </div>

                  {/* Dates & Financial Breakdown */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">{tx("Dates Reserved")}</span>
                      <span className="font-bold text-slate-800">
                        {bkg.startDate} to {bkg.endDate}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({bkg.totalDays} {bkg.totalDays === 1 ? "day" : "days"})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{tx("Platform Hiring Fee")}</span>
                      <span className="font-bold text-brand-700">
                        {bkg.paymentMethod === "admin_manual"
                          ? tx("Not collected")
                          : formatPrice(bkg.platformBookingFee || hiringFeeUSD(bkg.engagementType))}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {bkg.paymentMethod === "admin_manual"
                          ? tx("Manual assignment")
                          : "Paid to Web Owner"}
                      </span>
                    </div>
                  </div>

                  {/* Worker Expected Daily Salary Notice */}
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-sky-900">
                        {bkg.engagementType === "daily"
                          ? "Worker Expected Pay:"
                          : "Worker Expected Monthly Pay:"}
                      </span>
                      <span className="text-xs font-black text-sky-800">
                        {bkg.engagementType === "daily"
                          ? `${formatPrice(bkg.workerExpectedDailySalary || worker?.expectedDailySalary || 8)} / day`
                          : `${formatPrice(bkg.workerExpectedMonthlySalary || worker?.expectedMonthlySalary || 0)} / month`}
                      </span>
                    </div>
                    <p className="text-[10px] text-sky-700 leading-tight">
                      {bkg.paymentMethod === "admin_manual"
                        ? tx("Wages were not collected by Herlooku; arrange payment directly with the worker.")
                        : bkg.engagementType === "daily"
                        ? "Daily wages are collected by Herlooku and paid to the worker after the task is completed."
                        : "Pay the worker’s monthly salary directly to them."}
                    </p>
                  </div>

                  {/* STRICT PRIVACY NOTICE - NO PHONE OR EMAIL */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                      <Lock size={13} className="text-sky-400" />
                      <span>{tx("Platform Dispatch Active")}</span>
                    </span>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      For safety and privacy, direct phone/email contact is disabled. Herlooku Task Ninja platform dispatch manages helper arrival and coordinates fulfillment.
                    </p>
                  </div>

                  {bkg.specialInstructions && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-700">{tx("Notes:")} </span>
                      {bkg.specialInstructions}
                    </div>
                  )}

                  {/* Emergency Alarm Trigger for this Booking */}
                  <button
                    type="button"
                    onClick={() => {
                      setAlarmBookingId(bkg.id);
                      setAlarmModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <ShieldAlert size={15} className="text-rose-600" />
                    <span>🚨 {tx("Report an Incident with this Hire")}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Completed Bookings & Reviews */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-black text-slate-900">
          Past Completed Hires ({pastBookings.length})
        </h2>

        {pastBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-500">
            No completed past hires yet.
          </div>
        ) : (
          <div className="space-y-3">
            {pastBookings.map((bkg) => {
              const worker = workersMap[bkg.workerId];
              return (
                <div
                  key={bkg.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={worker?.user.avatar}
                      name={worker?.user.name || "Assigned Househelp"}
                      className="w-10 h-10 rounded-xl border border-slate-200"
                      textClassName="text-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {worker?.user.name}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold uppercase">
                          {bkg.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {bkg.serviceName} • {bkg.startDate} to {bkg.endDate} ({formatPrice(bkg.totalAmount)})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenReview(bkg)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Star size={14} className="text-amber-500" />
                    <span>{tx("Leave Verified Review")}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Leave Verified Review for {workersMap[reviewBooking.workerId]?.user.name}
              </h3>
              <button
                onClick={() => setReviewBooking(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">{tx("Thank you for your feedback!")}</h4>
                <p className="text-xs text-slate-500">{tx("Your review has been verified and published.")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{tx("Rating (1 to 5 Stars)")}</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          fill={star <= reviewRating ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-800 ml-2">
                      {reviewRating} of 5 Stars
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{tx("Your Experience")}</label>
                  <textarea
                    rows={4}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={tx("Describe how punctual, diligent, and helpful the worker was...")}
                    aria-label={tx("Your Experience")}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewBooking(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {reviewSubmitting ? "Publishing..." : "Submit Verified Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Emergency Alarm SOS Modal */}
      <EmergencyAlarmModal
        isOpen={alarmModalOpen}
        onClose={() => setAlarmModalOpen(false)}
        bookings={activeBookings}
        preselectedBookingId={alarmBookingId}
        userRole="client"
        onAlarmRaised={fetchData}
      />
    </div>
  );
}
