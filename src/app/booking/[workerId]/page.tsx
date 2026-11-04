"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  ArrowLeft,
  FileCheck,
  Receipt,
  ShieldAlert,
  Coins,
} from "lucide-react";
import {
  WorkerProfile,
  User,
  Booking,
  EngagementType,
  hiringFeeUSD,
  KES_PER_USD,
} from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

function BookingCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatPrice, currency } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const workerId = params?.workerId as string;

  const [workerData, setWorkerData] = useState<(WorkerProfile & { user: User }) | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking fields
  const [serviceName, setServiceName] = useState(searchParams.get("serviceName") || tx("General Househelp"));
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [clientAddress, setClientAddress] = useState(searchParams.get("clientAddress") || "");
  const [specialInstructions, setSpecialInstructions] = useState(searchParams.get("specialInstructions") || "");

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money">("mobile_money");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [phoneNumber, setPhoneNumber] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_MPESA_NUMBER || "+254 712 345 678"
  );

  // Flow states
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [paymentDestination, setPaymentDestination] = useState<{
    paybillNumber: string;
    configured: boolean;
  } | null>(null);
  const [paymentPrompt, setPaymentPrompt] = useState<{
    amountKes: number;
    paybillNumber: string;
    accountReference: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/payments/mpesa/config")
      .then((response) => response.json())
      .then((data) => setPaymentDestination(data))
      .catch(console.error);

    // 1. Fetch current user
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeUser) {
          setCurrentUser(data.activeUser);
          if (data.activeUser.location) {
            setClientAddress((current) => current || data.activeUser.location);
          }
        }
      })
      .catch(console.error);

    // 2. Fetch worker
    if (workerId) {
      fetch(`/api/workers/${workerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            setWorkerData(data.profile);
            if (data.profile.services?.length > 0) {
              setServiceName((current) => current || data.profile.services[0]);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [workerId]);

  useEffect(() => {
    if (!pendingBooking) return;
    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/mpesa/status?bookingId=${pendingBooking.id}`);
        const data = await response.json();
        if (data.booking?.paymentStatus === "paid" && data.booking?.status === "confirmed_exclusive") {
          setConfirmedBooking(data.booking);
          setPendingBooking(null);
        } else if (
          data.payment?.status === "failed" ||
          data.payment?.status === "expired" ||
          data.payment?.status === "cancelled"
        ) {
          setErrorMessage(t(`copy:${data.payment.resultDescription || "M-Pesa payment was not completed. You can try again."}`));
          setPendingBooking(null);
        }
      } catch {
        // Safaricom can take a moment to deliver the callback; keep polling.
      }
    };
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [pendingBooking, t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">{tx("Preparing exclusive checkout...")}</p>
      </div>
    );
  }

  if (!workerData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{tx("Worker Profile Not Found")}</h2>
        <Link href="/workers" className="text-sm text-brand-600 font-semibold underline">
          {tx("Return to Helper Directory")}
        </Link>
      </div>
    );
  }

  const availableEngagements: EngagementType[] =
    workerData.engagementTypes?.length > 0
      ? workerData.engagementTypes
      : ["daily"];
  const requestedEngagement = searchParams.get("engagementType");
  const engagementType: EngagementType =
    requestedEngagement === "monthly" &&
    availableEngagements.includes("monthly")
      ? "monthly"
      : availableEngagements.includes("daily")
        ? "daily"
        : "monthly";

  let totalDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e >= s) {
      const diff = Math.abs(e.getTime() - s.getTime());
      totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  const platformBookingFee = hiringFeeUSD(engagementType);
  const workerExpectedDailySalary =
    engagementType === "daily" ? workerData.expectedDailySalary || 8 : 0;
  const workerExpectedMonthlySalary =
    engagementType === "monthly"
      ? workerData.expectedMonthlySalary ||
        Math.round((workerData.expectedDailySalary || 8) * 26)
      : 0;
  const workerSalaryDueAtBooking =
    engagementType === "daily"
      ? workerExpectedDailySalary * totalDays
      : 0;
  const totalAmount = platformBookingFee + workerSalaryDueAtBooking;

  // Handle booking creation + payment
  const handleExecutePayment = async () => {
    setErrorMessage("");
    setProcessing(true);

    try {
      // Step 1: Create booking record
      const createRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: workerData.userId,
          serviceName,
          startDate,
          endDate,
          clientAddress,
          specialInstructions,
          engagementType,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setErrorMessage(t(`copy:${createData.error || "Could not initialize hire."}`));
        setProcessing(false);
        return;
      }

      const booking = createData.booking;

      // An STK request never locks a worker. Only Safaricom's server callback can do that.
      const payRes = await fetch("/api/payments/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          phoneNumber,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) {
        setErrorMessage(t(`copy:${payData.error || "Payment failed."}`));
        setProcessing(false);
        return;
      }

      setPaymentPrompt({
        amountKes: payData.amountKes,
        paybillNumber: payData.paybillNumber,
        accountReference: payData.accountReference,
      });
      setPendingBooking(booking);
    } catch (e: any) {
      setErrorMessage(t(`copy:${e.message || "An unexpected error occurred."}`));
    } finally {
      setProcessing(false);
    }
  };

  // SUCCESS SCREEN: NOTE ZERO PHONE/EMAIL SHARING
  if (confirmedBooking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-3xl p-8 border border-emerald-200/70 shadow-card space-y-6 text-center animate-fade-up">
          <div className="relative w-16 h-16 mx-auto">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={34} />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Lock size={13} />
              <span>{tx("Exclusive hire confirmed & locked")}</span>
            </div>
            <h1 className="display-1 text-3xl text-slate-900">
              {tx("M-Pesa payment confirmed")}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              <strong className="text-slate-900">{workerData.user.name}</strong> is now exclusively
              reserved for your household. No other client can book these dates.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 text-left space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div>
                <span className="text-xs text-slate-400 block font-medium">{tx("Booking Reference")}</span>
                <span className="text-base font-black text-brand-700">
                  {confirmedBooking.bookingRef}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">{tx("Payment Status")}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={13} /> Safaricom confirmed ({formatPrice(confirmedBooking.totalAmount)})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">{tx("Service Specialty")}</span>
                <span className="font-bold text-slate-900">{confirmedBooking.serviceName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Reserved Dates")}</span>
                <span className="font-bold text-slate-900">
                  {confirmedBooking.startDate} to {confirmedBooking.endDate} ({t(confirmedBooking.totalDays === 1 ? "copy:{days} day" : "copy:{days} days", { days: confirmedBooking.totalDays })})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Service Household")}</span>
                <span className="font-bold text-slate-900">{confirmedBooking.clientAddress}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{tx("Payment Mode")}</span>
                <span className="font-bold text-slate-900">{confirmedBooking.paymentMethod}</span>
              </div>
            </div>

            {/* STRICT PRIVACY / ZERO DIRECT COMMUNICATION NOTICE */}
            <div className="pt-4 border-t border-slate-200 bg-slate-900 text-white -mx-6 -mb-6 p-6 rounded-b-2xl space-y-2">
              <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Lock size={15} className="text-sky-400" />
                <span>{tx("Platform-Managed Dispatch Guarantee")}</span>
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Direct phone numbers and off-platform messaging between clients and domestic workers
                are strictly disabled for community safety and fraud prevention. Herlooku Task Ninja Dispatch
                handles worker arrival coordination and fulfillment updates.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard/client"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all"
            >
              {tx("Go to My Client Bookings Portal")}
            </Link>
            <Link
              href="/workers"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
            >
              {tx("Browse More Helpers")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pendingBooking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center">
            <Clock className="text-brand-600 animate-pulse" size={28} />
          </div>
          <div className="space-y-2">
            <span className="eyebrow">{tx("Awaiting secure confirmation")}</span>
            <h1 className="text-2xl font-black text-slate-900">{tx("Complete the M-Pesa prompt on your phone")}</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t("copy:We will lock {name}’s calendar after Safaricom confirms your {amount} payment.", {
                name: workerData.user.name,
                amount: formatPrice(totalAmount),
              })}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
            {tx("Booking Reference")} <strong className="text-slate-900">{pendingBooking.bookingRef}</strong>
          </div>
          {paymentPrompt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-950">
              <p>
                Paybill: <strong>{paymentPrompt.paybillNumber}</strong>
              </p>
              <p className="mt-1">
                Account/reference: <strong>{paymentPrompt.accountReference}</strong>
              </p>
              <p className="mt-1">
                Prompt amount: <strong>KSh {paymentPrompt.amountKes.toLocaleString()}</strong>
              </p>
            </div>
          )}
          <p className="text-[11px] text-slate-500">{tx("Confirm your PIN, then allow a few seconds for the secure provider confirmation.")}</p>
        </div>
      </div>
    );
  }

  // CHECKOUT SCREEN
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top back link */}
      <div>
        <Link
          href={`/workers/${workerId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t("copy:Back to {name}’s Profile", { name: workerData.user.name })}</span>
        </Link>
      </div>

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 text-[11px] font-bold uppercase tracking-wider">
          <Lock size={12} /> {tx("Secure M-Pesa Checkout")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {tx("Exclusive Hire Fee Checkout")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Pay Herlooku to secure <strong>{workerData.user.name}</strong>.
          Your worker is locked only after Safaricom confirms the M-Pesa payment.
        </p>
      </div>

      {/* ID Verification Gate Warning if Client is Unverified */}
      {currentUser && currentUser.idVerificationStatus !== "verified" && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <ShieldAlert size={20} className="text-amber-600" />
            <span>{tx("ID Verification Required Before Booking")}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your account status is currently{" "}
            <strong className="uppercase">{currentUser.idVerificationStatus}</strong>. To ensure
            domestic worker safety and eliminate fraudulent bookings, our policy requires all
            clients to submit a government ID before completing a reservation.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/verify-id"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              Submit Your ID for Verification Now &rarr;
            </Link>
            <span className="text-[11px] text-amber-700">{tx("Takes less than 2 minutes")}</span>
          </div>
        </div>
      )}

      {/* Main 2-column checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 cols: Booking Details & Payment Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Booking Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm shadow-slate-100 space-y-4 hover:shadow-md transition-shadow">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" />
              <span>{tx("1. Exclusive Hire Details")}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{tx("Service Specialty")}</label>
                <select
                  value={serviceName}
                  aria-label={tx("Service Specialty")}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  {workerData.services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{tx("Household Address")}</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder={tx("Street address, City...")}
                  aria-label={tx("Household Address")}
                  className="field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{tx("Start Date")}</label>
                <input
                  type="date"
                  value={startDate}
                  aria-label={tx("Start Date")}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="field"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">{tx("End Date")}</label>
                <input
                  type="date"
                  value={endDate}
                  aria-label={tx("End Date")}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="field"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {tx("Special Tasks / Household Notes (Optional)")}
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={tx("Specific instructions, priority tasks, house guidelines...")}
                aria-label={tx("Special Tasks / Household Notes (Optional)")}
                className="field"
              />
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div className="card p-6 space-y-4 hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-brand-600" />
                <span>{tx("2. Secure M-Pesa payment")}</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck size={14} /> {tx("Provider-verified STK Push")}
              </span>
            </div>

            <div className="space-y-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">{tx("M-Pesa / Phone Number")}</label>
                  <input
                    type="text"
                      aria-label={tx("M-Pesa / Phone Number")}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {tx("An M-Pesa PIN authorization prompt will be dispatched to your handset.")}
                </p>
                <p className="text-[11px] font-semibold text-slate-700">
                  Paybill: {paymentDestination?.paybillNumber || "542542"} ·
                  {" "}M-Pesa prompt total: KSh{" "}
                  {Math.round(totalAmount * KES_PER_USD).toLocaleString()}
                </p>
                {paymentDestination && !paymentDestination.configured && (
                  <p className="text-[11px] font-semibold text-amber-800">
                    M-Pesa prompts are temporarily unavailable. Please contact support.
                  </p>
                )}
            </div>

            {false && (
              <div className="space-y-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">{tx("Card Number")}</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">{tx("Expiry (MM/YY)")}</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">{tx("CVC")}</label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {false && (
              <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-xl text-xs text-brand-900 space-y-1">
                <span className="font-bold">✓ {tx("Sandbox Till Payment Simulation Mode")}</span>
                <p className="text-[11px] text-brand-800">
                  Simulates instant Till 8849201 verification without initiating real cellular M-Pesa billing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right col: Order Summary & Pay Button */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg shadow-slate-200/60 space-y-5 sticky top-24">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Booking Fee & Pay Summary
            </h3>

            {/* Worker mini preview */}
            <div className="flex items-center gap-3">
              <Image
                src={workerData.user.avatar}
                alt={workerData.user.name}
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {workerData.user.name}
                </span>
                <span className="text-[11px] text-slate-500 block">{workerData.headline}</span>
                <VerificationBadge status={workerData.user.idVerificationStatus} size="sm" />
              </div>
            </div>

            {/* Pricing table */}
            <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>{tx(engagementType === "daily" ? "Daily Platform Hiring Fee" : "Monthly Platform Hiring Fee")}</span>
                <span className="font-semibold text-slate-900">{formatPrice(platformBookingFee)}</span>
              </div>
              {engagementType === "daily" ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>{tx("Daily worker wages held by Herlooku")}</span>
                    <span className="font-semibold text-sky-800">
                      {formatPrice(workerSalaryDueAtBooking)}
                    </span>
                  </div>
                  <div className="text-[10px] text-sky-800">
                    {formatPrice(workerExpectedDailySalary)} / {tx("day")} × {totalDays} {tx("days")}
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>{tx("Expected monthly worker pay")}</span>
                  <span className="font-semibold text-sky-800">
                    {formatPrice(workerExpectedMonthlySalary)} / {tx("month")}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                <span>{tx("Total Due to Herlooku Now")}</span>
                <span className="text-brand-700">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {/* Crucial salary disclaimer */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <span className="font-bold block">{tx("Important Payment Terms:")}</span>
              <p className="leading-tight text-amber-800">
                {engagementType === "daily"
                  ? tx("Your payment includes the daily hiring fee and all booked daily wages. Herlooku holds the wages and pays the worker after the task is completed.")
                  : tx("Your payment includes the monthly hiring fee only. Pay the worker’s monthly salary directly to them.")}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertCircle size={14} />
                  <span>{tx("Error")}</span>
                </div>
                <p>{errorMessage}</p>
                {errorMessage.includes("ID verification is strictly required") && (
                  <Link href="/verify-id" className="block underline font-bold text-brand-700 mt-1">
                    Complete your ID verification now &rarr;
                  </Link>
                )}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleExecutePayment}
              disabled={
                processing ||
                !startDate ||
                !endDate ||
                !clientAddress ||
                (currentUser?.idVerificationStatus !== "verified") ||
                paymentDestination?.configured === false
              }
              className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                processing ||
                !startDate ||
                !endDate ||
                !clientAddress ||
                currentUser?.idVerificationStatus !== "verified" ||
                paymentDestination?.configured === false
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{tx("Securing Exclusive Lock...")}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>
                    {paymentDestination?.configured === false
                      ? tx("M-Pesa unavailable")
                      : t("copy:Send M-Pesa prompt for {amount}", { amount: formatPrice(totalAmount) })}
                  </span>
                </>
              )}
            </button>

            <div className="space-y-1.5 text-[11px] text-slate-400 text-center">
              <p>{tx("Worker’s calendar locked exclusively upon payment.")}</p>
              <p>{tx("Your calendar is locked after the payment is confirmed.")}</p>
              <p>
                {engagementType === "daily"
                  ? tx("Herlooku pays the daily worker after task completion.")
                  : tx("Monthly workers are paid directly by their employers.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingCheckoutPageWithSuspense() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">{t("copy:Loading checkout...")}</p>
        </div>
      }
    >
      <BookingCheckoutPage />
    </Suspense>
  );
}
