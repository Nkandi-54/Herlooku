"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Calendar,
  IdCard,
  Eye,
  EyeOff,
  UserX,
} from "lucide-react";
import { User } from "@/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { VerificationBadge } from "@/components/VerificationBadge";

const PASSWORD_MIN = 8;

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= PASSWORD_MIN) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const strengthMeta = [
  { label: "Too weak", color: "bg-rose-500", text: "text-rose-600" },
  { label: "Weak", color: "bg-orange-500", text: "text-orange-600" },
  { label: "Fair", color: "bg-amber-500", text: "text-amber-600" },
  { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Excellent", color: "bg-emerald-600", text: "text-emerald-700" },
];

/**
 * Account & Security panel shared by the client and worker dashboards.
 *
 * Surfaces the account lifecycle state (approval + ID verification) and lets
 * the signed-in user rotate their own password through
 * `POST /api/accounts/password`. Requires the current password so a hijacked
 * session cannot silently lock the owner out.
 */
export default function AccountSecurity() {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setCurrentUser(data.activeUser);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const strength = passwordStrength(newPassword);
  const meta = strengthMeta[strength];

  const mismatch = useMemo(
    () => confirmPassword.length > 0 && confirmPassword !== newPassword,
    [confirmPassword, newPassword],
  );

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= PASSWORD_MIN &&
    newPassword === confirmPassword &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < PASSWORD_MIN) {
      setError(
        tx(`Choose a password with at least ${PASSWORD_MIN} characters.`),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tx("The new password and confirmation do not match."));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || tx("Could not update your password. Please try again."),
        );
        return;
      }

      setSuccess(data.message || tx("Your password has been updated."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError(
        tx("Network error. Please check your connection and try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const accountStatus = currentUser?.accountStatus || "pending";
  const statusStyles: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    suspended: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const inputType = showPasswords ? "text" : "password";
  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeletionMessage("");
    setDeletionSubmitting(true);
    try {
      const response = await fetch("/api/accounts/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deletionConfirmation.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeletionMessage(data.error || tx("Could not delete your account."));
        return;
      }
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.replace("/login");
    } catch (requestError) {
      console.error(requestError);
      setDeletionMessage(tx("Network error. Please try again."));
    } finally {
      setDeletionSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-brand-600" />
          {tx("Account & Security")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {tx(
            "Manage your sign-in credentials and review your account standing.",
          )}
        </p>
      </div>

      {/* Account overview */}
      <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          {tx("Account Overview")}
        </h2>

        {loadingUser ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <Loader2 size={16} className="animate-spin" />
            {tx("Loading your account…")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <IdCard size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  {tx("Full Name")}
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser?.name || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  {tx("Email Address")}
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser?.email || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  {tx("Phone Number")}
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser?.phone || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck
                size={16}
                className="text-slate-400 mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  {tx("Account Status")}
                </span>
                <span
                  className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    statusStyles[accountStatus] || statusStyles.pending
                  }`}
                >
                  {tx(accountStatus)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <ShieldAlert
                size={16}
                className="text-slate-400 mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  {tx("ID Verification")}
                </span>
                <div className="mt-1">
                  <VerificationBadge
                    status={currentUser?.idVerificationStatus || "unverified"}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentUser?.accountStatusReason &&
          (accountStatus === "rejected" || accountStatus === "suspended") && (
            <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              <p className="text-[11px] font-semibold leading-relaxed">
                {currentUser.accountStatusReason}
              </p>
            </div>
          )}
      </section>

      {(currentUser?.role === "client" || currentUser?.role === "worker") && (
        <section className="bg-white/80 backdrop-blur-xl border border-rose-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-rose-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {tx("Delete Account")}
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {tx("Permanently delete your sign-in and personal profile. Past booking and payment records are retained in anonymized form for audit. Deletion is blocked while you have ongoing tasks or pending/unpaid bills.")}
          </p>
          <form onSubmit={deleteAccount} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              {tx("Type DELETE to confirm")}
            </label>
            <input
              value={deletionConfirmation}
              onChange={(event) => setDeletionConfirmation(event.target.value)}
              autoComplete="off"
              required
              disabled={deletionSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 disabled:bg-slate-100"
            />
            {deletionMessage && (
              <p role="alert" className="text-xs font-semibold text-rose-700">
                {deletionMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={
                deletionSubmitting ||
                deletionConfirmation.trim() !== "DELETE"
              }
              className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletionSubmitting
                ? tx("Deleting…")
                : tx("Permanently delete my account")}
            </button>
          </form>
        </section>
      )}

      {/* Change password */}
      <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-brand-600" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            {tx("Change Password")}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {tx("Current Password")}
            </label>
            <input
              type={inputType}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition"
              placeholder={tx("Enter your current password")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {tx("New Password")}
            </label>
            <input
              type={inputType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition"
              placeholder={tx("At least 8 characters")}
            />
            {newPassword.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < strength ? meta.color : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-bold ${meta.text}`}>
                  {tx(meta.label)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {tx("Confirm New Password")}
            </label>
            <input
              type={inputType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                mismatch
                  ? "border-rose-300 focus:ring-rose-400/40 focus:border-rose-400"
                  : "border-slate-200 focus:ring-brand-500/40 focus:border-brand-400"
              }`}
              placeholder={tx("Re-enter your new password")}
            />
            {mismatch && (
              <span className="text-[10px] font-bold text-rose-600">
                {tx("Passwords do not match.")}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>
              {showPasswords ? tx("Hide passwords") : tx("Show passwords")}
            </span>
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              <p className="text-[11px] font-semibold leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <p className="text-[11px] font-semibold leading-relaxed">
                {success}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <KeyRound size={14} />
            )}
            <span>{tx("Update Password")}</span>
          </button>
        </form>

        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <ShieldCheck size={15} className="text-brand-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {tx(
              "For your safety we ask for your current password. Use a unique password you do not reuse on other websites.",
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
