"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  FileCheck,
  Camera,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UserCheck,
  FileText,
  Bell,
} from "lucide-react";
import { User } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PrivateDocumentUpload } from "@/components/PrivateDocumentUpload";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  enablePushNotifications,
  getExistingPushSubscription,
} from "@/lib/push-client";

export default function VerifyIdPage() {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Form fields
  const [idType, setIdType] = useState<"national_id" | "passport" | "drivers_license">(
    "national_id"
  );
  const [idNumber, setIdNumber] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [idDocumentBackUrl, setIdDocumentBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    void getExistingPushSubscription().then((sub) => setPushEnabled(Boolean(sub)));
  }, []);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const result = await enablePushNotifications();
    if (result.ok) {
      setPushEnabled(true);
      setFeedback({
        type: "success",
        text: tx("Device push notifications enabled! You will receive reminders every 6 hours."),
      });
    } else {
      setFeedback({
        type: "error",
        text: tx(result.message),
      });
    }
    setEnablingPush(false);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.activeUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    const handleAuth = () => fetchUser();
    window.addEventListener("auth-changed", handleAuth);
    return () => window.removeEventListener("auth-changed", handleAuth);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!idNumber || !idDocumentUrl || !selfieUrl) {
      setFeedback({
        type: "error",
        text: tx("Please fill in ID document number, provide document image, and provide a selfie photo."),
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idType,
          idNumber,
          idDocumentUrl,
          idDocumentBackUrl,
          selfieUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success && data?.user) {
        setFeedback({
          type: "success",
          text: tx("Verification submitted successfully! Switch to the Admin persona in the header to approve your ID."),
        });
        setCurrentUser(data.user);
        window.dispatchEvent(new Event("auth-changed"));
      } else {
        setFeedback({
          type: "error",
          text: t(`copy:${data?.error || "Failed to submit verification."}`),
        });
      }
    } catch (error) {
      console.error("ID verification submission failed:", error);
      setFeedback({
        type: "error",
        text: tx("Network error while submitting verification. Please try again."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">{tx("Loading identity verification status...")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ink via-ink-soft to-brand-950 rounded-[2rem] p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-up">
        <div aria-hidden className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
        <div className="relative space-y-2.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-bold border border-white/15 backdrop-blur-sm w-fit">
            <ShieldCheck size={14} />
            <span>{tx("Two-Sided Safety Trust Standard")}</span>
          </div>
          <h1 className="display-1 text-3xl">{tx("Identity Verification")}</h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Herlooku Task Ninja strictly requires government identification from both clients and househelps
            before allowing bookings or listings.
          </p>
        </div>

        {currentUser && (
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/12 shrink-0 text-center space-y-2 min-w-[12rem]">
            <span className="text-[11px] text-slate-300 block">{tx("Your Current Status")}</span>
            <VerificationBadge status={currentUser.idVerificationStatus} size="lg" />
            <span className="text-[11px] text-slate-400 block capitalize">
              {t("roles." + currentUser.role)}
            </span>
          </div>
        )}
      </div>

      {/* STATUS OVERVIEWS */}

      {/* Case 1: Already Verified */}
      {currentUser?.idVerificationStatus === "verified" && (
        <div className="card p-8 border-emerald-200 space-y-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{tx("Your Identity is Verified ✓")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tx("Verified on")}{" "}
                {new Date(currentUser.verifiedAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 text-xs text-emerald-900 space-y-2">
            <span className="font-bold block">{tx("Account Privileges Enabled:")}</span>
            <ul className="space-y-1.5 list-disc list-inside text-emerald-800">
              {currentUser.role === "client" ? (
                <>
                  <li>{tx("Full permission to book any househelp with exclusive reservation lock.")}</li>
                  <li>{tx("Access to verified worker telephone and direct contact details upon checkout.")}</li>
                  <li>{tx("Eligible for Herlooku Task Ninja Till Verification Guarantee.")}</li>
                </>
              ) : (
                <>
                  <li>{tx("Profile is active and visible in the public helper search directory.")}</li>
                  <li>{tx("Eligible to receive verified exclusive bookings and direct daily compensation from clients.")}</li>
                  <li>{tx("Verified badge displayed on your public profile card.")}</li>
                </>
              )}
            </ul>
          </div>

          <div className="pt-2 flex gap-4">
            <Link
              href={currentUser.role === "worker" ? "/dashboard/worker" : "/workers"}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {currentUser.role === "worker" ? tx("Go to Worker Dashboard") : tx("Browse & Book Helpers")}
            </Link>
          </div>
        </div>
      )}

      {/* Case 2: Pending Review */}
      {currentUser?.idVerificationStatus === "pending" && (
        <div className="card p-8 border-amber-200 space-y-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{tx("Verification Under Review")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tx("Submitted on")} {new Date(currentUser.submittedAt || Date.now()).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="leading-relaxed">
              {tx("Our trust and compliance specialists are reviewing your submitted documents. Verification is usually completed within 30 minutes.")}
            </p>
            <div className="pt-2">
              <p className="font-bold text-amber-950">
                💡 Evaluating the platform right now? Switch to the &quot;Platform Administrator&quot; persona
                in the top right to approve this request immediately!
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin/verifications"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              {t("copy:View Admin Review Queue →")}
            </Link>
          </div>
        </div>
      )}

      {/* Case 3: Rejected */}
      {currentUser?.idVerificationStatus === "rejected" && (
        <div className="bg-rose-50 rounded-3xl p-8 border border-rose-200 space-y-4">
          <div className="flex items-center gap-3 text-rose-800 font-bold text-lg">
            <AlertCircle size={24} className="text-rose-600" />
            <span>{tx("Document Verification Rejected")}</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            {tx("Reason:")} <strong>{currentUser.rejectionReason || tx("Blurry document or mismatch")}</strong>.
            {tx("Please submit a clear, legible government ID document and photo below.")}
          </p>
        </div>
      )}

      {/* Submission Form (Shown if Unverified or Rejected) */}
      {(currentUser?.idVerificationStatus === "unverified" ||
        currentUser?.idVerificationStatus === "rejected") && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {tx("Submit Government Identity Documents")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tx("Accepted: National ID, Passport, or Driver’s License")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Device Push Reminders Opt-in Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-sky-600 text-white shrink-0 mt-0.5">
                  <Bell size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-sky-950">
                    {tx("6-Hour Device Push Reminders")}
                  </p>
                  <p className="text-[11px] text-sky-800 mt-0.5">
                    {pushEnabled
                      ? tx("Active on this device: You will receive notifications every 6 hours and upon approval.")
                      : tx("Get notified on your phone or desktop every 6 hours until verification is approved.")}
                  </p>
                </div>
              </div>
              <div>
                {pushEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold whitespace-nowrap">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{tx("Enabled")}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={enablingPush}
                    onClick={handleEnablePush}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow whitespace-nowrap disabled:opacity-50"
                  >
                    <Bell size={13} />
                    <span>{enablingPush ? tx("Enabling…") : tx("Enable push")}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-950">
              <p className="font-bold">{tx("How we handle your identity documents")}</p>
              <p className="mt-1">
                {tx("Your ID number, ID photos and selfie are stored privately and accessible only to authorized administrators for verification review. We delete those details and files after an administrator makes a decision; we retain only the verification outcome and review audit record.")}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">{tx("Document Type")}</label>
                <select
                  value={idType}
                  onChange={(e: any) => setIdType(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="national_id">{tx("National ID Card")}</option>
                  <option value="passport">{tx("Passport")}</option>
                  <option value="drivers_license">{tx("Driver’s License")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {tx("Document Identification Number")}
                </label>
                <input
                  type="text"
                  placeholder={tx("e.g. NID-883921-X or P992810")}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Document Image Front */}
            <PrivateDocumentUpload
              label={tx("Front Side of Document")}
              hint={tx("Must be crisp & readable")}
              value={idDocumentUrl}
              onChange={setIdDocumentUrl}
              documentKind="id_front"
            />

            {/* Document Image Back (Optional for Passport) */}
            {idType !== "passport" && (
              <PrivateDocumentUpload
                label={tx("Back Side of Document (Optional)")}
                hint={tx("Barcode / Signature side")}
                value={idDocumentBackUrl}
                onChange={setIdDocumentBackUrl}
                documentKind="id_back"
              />
            )}

            {/* Live Selfie */}
            <PrivateDocumentUpload
              label={tx("Facial Verification Photo / Selfie")}
              hint={tx("Matches ID photo")}
              value={selfieUrl}
              onChange={setSelfieUrl}
              documentKind="selfie"
              aspect="portrait"
            />

            {feedback && (
              <div
                className={`p-4 rounded-xl text-xs font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{tx("Submitting for Verification...")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>{tx("Submit ID for Compliance Review")}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
