"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  HandCoins,
  HeartCrack,
  UserX,
  FileWarning,
  X,
  MapPin,
  CheckCircle2,
  PhoneCall,
  Radio,
  FileText,
} from "lucide-react";
import { Booking, EmergencyAlarmType } from "@/types";
import { useLanguage } from "@/i18n/LanguageContext";

interface EmergencyAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings?: Booking[];
  preselectedBookingId?: string;
  userRole?: "client" | "worker";
  onAlarmRaised?: () => void;
}

export const EmergencyAlarmModal: React.FC<EmergencyAlarmModalProps> = ({
  isOpen,
  onClose,
  bookings = [],
  preselectedBookingId,
  userRole = "client",
  onAlarmRaised,
}) => {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [alarmType, setAlarmType] = useState<EmergencyAlarmType>("abuse");
  const [severity, setSeverity] = useState<"critical" | "urgent">("critical");
  const [selectedBookingId, setSelectedBookingId] = useState(
    preselectedBookingId || bookings[0]?.id || ""
  );
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  React.useEffect(() => {
    if (selectedBookingId) {
      const b = bookings.find((item) => item.id === selectedBookingId);
      if (b?.clientAddress && !location) {
        setLocation(b.clientAddress);
      }
    }
  }, [selectedBookingId, bookings, location]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!details.trim()) {
      setErrorMessage(tx("Please describe the incident in the details box."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/emergencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBookingId || undefined,
          alarmType,
          severity,
          details: details.trim(),
          location: location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessData(data.alarm);
        if (onAlarmRaised) onAlarmRaised();
      } else {
        setErrorMessage(t(`copy:${data.error || "Failed to submit. For burglary, fire or medical emergencies, dial 999 / 112 directly."}`));
      }
    } catch (e: any) {
      setErrorMessage(
        t(`copy:${e.message || "Network error. If in danger, dial 999/112 immediately."}`)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessData(null);
    setDetails("");
    setErrorMessage("");
    onClose();
  };

  const incidentTypes: {
    key: EmergencyAlarmType;
    label: string;
    sub: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: "theft",
      label: "Stealing / Theft",
      sub: "Missing cash or valuables",
      icon: <HandCoins size={16} />,
      color: "bg-rose-100 text-rose-600",
    },
    {
      key: "abuse",
      label: "Abuse / Mistreatment",
      sub: "Verbal or physical abuse",
      icon: <HeartCrack size={16} />,
      color: "bg-red-100 text-red-600",
    },
    {
      key: "neglect",
      label: "Neglect / Unsafe Care",
      sub: "Child or duty left unattended",
      icon: <UserX size={16} />,
      color: "bg-amber-100 text-amber-600",
    },
    {
      key: "misconduct",
      label: "Contract Misconduct",
      sub: "Absenteeism, breach, fraud",
      icon: <FileWarning size={16} />,
      color: "bg-slate-200 text-slate-700",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      {/* Centering wrapper: scrollable on small screens, centered on desktop */}
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="relative w-full max-w-lg sm:max-w-xl border-2 border-rose-500 bg-white shadow-2xl sm:rounded-3xl overflow-hidden my-auto">

          {/* ── HEADER ─────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white text-rose-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
                    {tx("Incident Report")}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-100 flex items-center gap-1">
                    <Radio size={10} className="animate-pulse shrink-0" /> {tx("Live Dispatch")}
                  </span>
                </div>
                <h2 className="text-sm font-black text-white mt-0.5 leading-tight">
                  {tx("Report a Client–Worker Incident")}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              aria-label={tx("Close")}
              className="shrink-0 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── SUCCESS VIEW ────────────────────────────────────── */}
          {successData ? (
            <div className="p-5 space-y-4 text-center">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border-4 border-rose-200 animate-bounce">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                  Ref: {successData.id}
                </p>
                <h3 className="text-base font-black text-slate-900">
                  {tx("Incident Report Submitted!")}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  {tx("Herlooku Trust & Safety has received your report and will intervene between the client and worker.")}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{tx("Category:")}</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {tx(successData.alarmType)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{tx("Severity:")}</span>
                  <span className="font-bold text-rose-600 uppercase">
                    {tx(successData.severity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{tx("Location:")}</span>
                  <span className="font-bold text-slate-900 text-right max-w-[60%]">
                    {successData.location}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2 font-semibold">
                <PhoneCall size={14} className="shrink-0" />
                <span>
                  {tx("For fire, burglary or medical emergencies, dial 999 / 112.")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                {tx("Close & Monitor Status")}
              </button>
            </div>
          ) : (
            /* ── FORM VIEW ─────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="divide-y divide-slate-100">

              {/* Section 1 — Incident Type */}
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  {tx("1. Select Incident Type")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {incidentTypes.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAlarmType(t.key)}
                      className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2 transition-all ${
                        alarmType === t.key
                          ? "border-rose-500 bg-rose-50 ring-1 ring-rose-400/30"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.color}`}
                      >
                        {t.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="text-[11px] font-black text-slate-800 block truncate">
                          {tx(t.label)}
                        </span>
                        <span className="text-[9px] text-slate-500 block truncate">
                          {tx(t.sub)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2 — Urgency + Booking */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    {tx("Urgency")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSeverity("critical")}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        severity === "critical"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tx("Critical")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity("urgent")}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        severity === "urgent"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tx("Urgent")}
                    </button>
                  </div>
                </div>

                {bookings.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      {tx("Associated Hire")}
                    </p>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                      className="w-full text-[11px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bookingRef} — {b.serviceName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Section 3 — Location */}
              <div className="p-4 space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} className="text-rose-600" />
                  {tx("Physical Location")}
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={tx("e.g. Westlands, Parklands Rd, Gate 4B, Nairobi")}
                  aria-label={tx("Physical Location")}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Section 4 — Details */}
              <div className="p-4 space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} className="text-rose-600" />
                  {tx("Incident Details")}
                </label>
                <textarea
                  rows={3}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={tx("What happened? Who was involved? Current safety status?")}
                  aria-label={tx("Incident Details")}
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="mx-4 mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── FOOTER (always last, guaranteed visible) ─────────── */}
              <div className="p-4 bg-slate-50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="shrink-0 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-colors"
                >
                  {tx("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !details.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shadow flex items-center justify-center gap-2 transition-all ${
                    submitting || !details.trim()
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 hover:shadow-md active:scale-[0.99]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {tx("Broadcasting...")}
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={15} />
                      {tx("🚨 Submit Incident Report")}
                    </>
                  )}
                </button>
              </div>

              {/* Emergency dial reminder */}
              <p className="text-[10px] text-slate-400 text-center px-4 pb-3 leading-tight">
                {tx("For burglary, fire or medical emergencies — dial 999 / 112 directly.")}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
