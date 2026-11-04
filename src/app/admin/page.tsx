"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  Lock,
  DollarSign,
  Users,
  Coins,
  Radio,
  HandCoins,
  HeartCrack,
  UserX,
  FileWarning,
  PhoneCall,
  Send,
  Check,
  Search,
  Filter,
  Receipt,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Maximize2,
  AlertTriangle,
  Crown,
  UserCog,
  ShieldPlus,
  ShieldMinus,
  Trash2,
} from "lucide-react";
import {
  User,
  Booking,
  EmergencyAlarm,
  hiringFeeUSD,
  isAdminRole,
  isSuperAdmin,
} from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PrivateDocumentImage } from "@/components/PrivateDocumentImage";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";

function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabParam = searchParams.get("tab") || "overview";
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<string>(activeTabParam);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlarm[]>([]);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<
    {
      id: string;
      user: User | null;
      reason: string;
      requested_at: string;
    }[]
  >([]);
  const [deletionAudit, setDeletionAudit] = useState<
    {
      id: string;
      target_name: string;
      target_email: string;
      actor_name: string;
      actor_email: string;
      action: string;
      reason: string;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [emergencyFilter, setEmergencyFilter] = useState<string>("all");
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);

  // Emergency Response State
  const [alarmNotes, setAlarmNotes] = useState<Record<string, string>>({});
  const [alarmUpdating, setAlarmUpdating] = useState<string | null>(null);
  const [bookingUpdating, setBookingUpdating] = useState<string | null>(null);

  // Verification Review State
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    "Image is blurry and document text is illegible"
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (activeTabParam) {
      setActiveTab(activeTabParam);
    }
  }, [activeTabParam]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`);
  };

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        setCurrentUser(authData.activeUser);
      }

      const verRes = await fetch("/api/verification");
      if (verRes.ok) {
        const verData = await verRes.json();
        setPendingUsers(verData.pendingVerifications || []);
        setVerifiedUsers(verData.verifiedUsers || []);
        setRejectedUsers(verData.rejectedUsers || []);
        setAllUsers([
          ...(verData.pendingVerifications || []),
          ...(verData.verifiedUsers || []),
          ...(verData.rejectedUsers || []),
        ]);
      }

      const bkgRes = await fetch("/api/bookings");
      if (bkgRes.ok) {
        const bkgData = await bkgRes.json();
        setBookings(bkgData.bookings || []);
      }

      const emRes = await fetch("/api/emergencies");
      if (emRes.ok) {
        const emData = await emRes.json();
        setEmergencies(emData.alarms || []);
      }

      // Every account, not just the verified workers shown above.
      const accRes = await fetch("/api/admin/accounts");
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }

      const deletionRes = await fetch("/api/admin/account-deletion-requests");
      if (deletionRes.ok) {
        const deletionData = await deletionRes.json();
        setDeletionRequests(deletionData.requests || []);
        setDeletionAudit(deletionData.audit || []);
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
    const pollInterval = setInterval(fetchData, 15000);
    return () => {
      window.removeEventListener("auth-changed", handleAuth);
      clearInterval(pollInterval);
    };
  }, []);

  const handleReview = async (targetUserId: string, decision: "approve" | "reject") => {
    setReviewActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/verification/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          decision,
          rejectionReason: decision === "reject" ? rejectReason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Review failed" });
      } else {
        setFeedback({
          type: "success",
          text: `Verification successfully ${decision === "approve" ? "APPROVED" : "REJECTED"} for user.`,
        });
        setInspectUser(null);
        fetchData();
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Network error" });
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleUpdateAlarmStatus = async (alarmId: string, newStatus: string) => {
    setAlarmUpdating(alarmId);
    try {
      const currentNote = alarmNotes[alarmId];
      const res = await fetch("/api/emergencies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alarmId,
          status: newStatus,
          adminNotes: currentNote,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: "success",
          text: `🚨 Alarm status updated to "${newStatus.toUpperCase()}". Incident logged.`,
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAlarmUpdating(null);
    }
  };

  const handleChangeRole = async (
    account: User,
    role: "client" | "worker" | "admin",
  ) => {
    const promoting = role === "admin";
    if (
      promoting &&
      !window.confirm(
        `Grant administrator access to ${account.name} (${account.email})? They will be able to see all accounts, verify identities, and manage bookings.`,
      )
    ) {
      return;
    }
    if (
      !promoting &&
      !window.confirm(
        `Remove administrator access from ${account.name} and make them a ${role}?`,
      )
    ) {
      return;
    }

    setRoleUpdating(account.id);
    setFeedback(null);
    try {
      // Grants go through the audited role-change endpoint. Revocations use the
      // same endpoint, which the database enforces per your role policy.
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: account.id, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Could not update role." });
      } else {
        setFeedback({
          type: "success",
          text:
            data.message ||
            (promoting
              ? "Account promoted to administrator."
              : "Administrator access removed."),
        });
        await fetchData();
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Network error" });
    } finally {
      setRoleUpdating(null);
    }
  };

  const handleHideAccount = async (account: User) => {
    const reason = window.prompt(
      `Why should ${account.name}'s account be hidden? This is recorded in the audit history.`,
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setFeedback({ type: "error", text: "Enter a reason of at least 3 characters." });
      return;
    }

    setAccountActionLoading(account.id);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: account.id, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: "error", text: data.error || "Could not hide account." });
      } else {
        setFeedback({ type: "success", text: data.message });
        await fetchData();
      }
    } catch (error: any) {
      setFeedback({ type: "error", text: error.message || "Network error." });
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleDeletionRequest = async (
    requestId: string,
    decision: "approve" | "reject",
    workerName: string,
  ) => {
    const reason = window.prompt(
      `Enter the reason for ${decision === "approve" ? "approving" : "rejecting"} ${workerName}'s request:`,
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setFeedback({ type: "error", text: "Enter a reason of at least 3 characters." });
      return;
    }

    setAccountActionLoading(requestId);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/account-deletion-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({ type: "error", text: data.error || "Could not resolve request." });
      } else {
        setFeedback({ type: "success", text: data.message });
        await fetchData();
      }
    } catch (error: any) {
      setFeedback({ type: "error", text: error.message || "Network error." });
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleBookingAction = async (
    booking: Booking,
    action: "complete" | "mark_worker_paid",
  ) => {
    if (
      action === "mark_worker_paid" &&
      !window.confirm(
        `Confirm the Herlooku payout of ${formatPrice(
          booking.workerExpectedDailySalary * booking.totalDays,
        )} was sent to the worker.`,
      )
    ) {
      return;
    }
    setBookingUpdating(booking.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Could not update booking.",
        });
      } else {
        setFeedback({
          type: "success",
          text:
            action === "complete"
              ? "Booking marked complete. Daily worker payout is now due."
              : "Daily worker payout marked as sent.",
        });
        await fetchData();
      }
    } catch (error: any) {
      setFeedback({ type: "error", text: error.message || "Network error" });
    } finally {
      setBookingUpdating(null);
    }
  };

  // Metrics Calculations
  const activeEmergencies = emergencies.filter(
    (e) => e.status === "active" || e.status === "responding"
  );
  const resolvedEmergencies = emergencies.filter((e) => e.status === "resolved");

  const totalPlatformFees = bookings
    .filter((b) => b.status === "confirmed_exclusive" || b.status === "in_progress" || b.status === "completed")
    .reduce((sum, b) => sum + (b.platformBookingFee || hiringFeeUSD(b.engagementType)), 0);

  const activeLocks = bookings.filter(
    (b) => b.status === "confirmed_exclusive" || b.status === "in_progress"
  );

  const verifiedRate =
    allUsers.length > 0
      ? Math.round(
          (allUsers.filter((u) => u.idVerificationStatus === "verified").length / allUsers.length) *
            100
        )
      : 100;

  // Filtered Accounts List (every account on the platform)
  const filteredAccounts = accounts.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.location && u.location.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.idNumber && u.idNumber.toLowerCase().includes(q));
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" ? isAdminRole(u.role) : u.role === roleFilter);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "deleted"
        ? Boolean(u.deletedAt)
        : !u.deletedAt && (u.accountStatus || "pending") === statusFilter);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const adminAccounts = accounts.filter((u) => isAdminRole(u.role));
  const viewerIsSuperAdmin = isSuperAdmin(currentUser?.role);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 rounded-3xl p-6 sm:p-8 border border-slate-800/80 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
            <ShieldCheck size={14} className="text-purple-400" />
            <span>Executive Trust, Compliance & Revenue Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Herlooku Task Ninja Command Center
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage incident reports, verify identity credentials, audit daily and monthly hiring fees, and track daily worker wage payouts.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-800 text-xs shrink-0 flex-wrap relative z-10">
          <div className="pr-3">
            <span className="text-slate-300 block text-[11px] font-semibold">Active Alarms</span>
            <span
              className={`text-2xl font-black flex items-center gap-1.5 ${
                activeEmergencies.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"
              }`}
            >
              {activeEmergencies.length > 0 && (
                <Radio size={16} className="animate-ping text-rose-500" />
              )}
              {activeEmergencies.length}
            </span>
          </div>
          <div className="border-l border-slate-800 pl-3 pr-3">
            <span className="text-slate-300 block text-[11px] font-semibold">Pending IDs</span>
            <span className="text-2xl font-black text-amber-400">{pendingUsers.length}</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-300 block text-[11px] font-semibold">Platform Fee Total</span>
            <span className="text-2xl font-black text-emerald-400">
              {formatPrice(totalPlatformFees)}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-lg transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
              : "bg-rose-950/90 text-rose-300 border border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Platform Revenue */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Web Owner Hiring Fees</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{formatPrice(totalPlatformFees)}</div>
            <p className="text-[11px] text-slate-300 mt-1">
              Daily fee Ksh 1,000; monthly fee Ksh 3,000
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
            <span>Direct Web Owner Model</span>
            <span>Daily Wages Held Until Completion</span>
          </div>
        </div>

        {/* KPI 2: Active Calendar Locks */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Exclusive Calendar Locks</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Lock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{activeLocks.length}</div>
            <p className="text-[11px] text-slate-300 mt-1">
              Active households with locked domestic help
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-purple-400 font-bold">
            <span>Calendar Exclusivity</span>
            <span>{bookings.length} Total Hires</span>
          </div>
        </div>

        {/* KPI 3: Pending Verification */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Verification Queue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{pendingUsers.length}</div>
            <p className="text-[11px] text-slate-300 mt-1">
              National IDs awaiting compliance review
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
            <span>Compliance Rate</span>
            <span className="text-white font-bold">{verifiedRate}% Verified</span>
          </div>
        </div>

        {/* KPI 4: Incident Response Readiness */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Client–Worker Incidents</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                activeEmergencies.length > 0
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-sky-500/20 text-sky-400"
              }`}
            >
              <ShieldAlert size={16} />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-black ${
                activeEmergencies.length > 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {activeEmergencies.length > 0 ? `${activeEmergencies.length} Active` : "Safe & Clear"}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {resolvedEmergencies.length} past incidents handled and resolved
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
            <span>Trust & Safety Desk</span>
            <span className="text-emerald-400 font-bold">Desk Online</span>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === "overview"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Sparkles size={15} />
          <span>Executive Overview</span>
        </button>

        <button
          onClick={() => handleTabChange("emergencies")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === "emergencies"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <ShieldAlert size={15} />
          <span>Incident Command</span>
          {activeEmergencies.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black animate-pulse">
              {activeEmergencies.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("verifications")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === "verifications"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Clock size={15} />
          <span>ID Verification Queue</span>
          {pendingUsers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("bookings")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === "bookings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Receipt size={15} />
          <span>Bookings & Fee Ledger</span>
          <span className="text-[10px] text-slate-400 font-mono">({bookings.length})</span>
        </button>

        <button
          onClick={() => handleTabChange("users")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all shrink-0 ${
            activeTab === "users"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Users size={15} />
          <span>All Accounts & Roles</span>
          <span className="text-[10px] text-slate-400 font-mono">({accounts.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Urgent Incident Alert Bar if active reports exist */}
          {activeEmergencies.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-200">
                    Open Incident Reports ({activeEmergencies.length})
                  </h3>
                  <p className="text-xs text-slate-200">
                    High priority client–worker incident reported at:{" "}
                    <strong>{activeEmergencies[0].location}</strong>. Immediate admin triage required.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("emergencies")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shrink-0"
              >
                Go to Incident Command
              </button>
            </div>
          )}

          {/* Side-by-side Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Action: Pending Verifications */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Pending ID Submissions</h3>
                </div>
                <button
                  onClick={() => handleTabChange("verifications")}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <span>View All ({pendingUsers.length})</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ✓ Zero pending identity verifications. Queue is clean.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={user.avatar}
                          name={user.name}
                          className="w-10 h-10 rounded-xl border border-slate-800"
                          textClassName="text-xs"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {user.email} • <span className="uppercase text-purple-400">{user.role}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setInspectUser(user);
                          handleTabChange("verifications");
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action: Recent Bookings & Constant Fees */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Recent Exclusive Hires</h3>
                </div>
                <button
                  onClick={() => handleTabChange("bookings")}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <span>View All ({bookings.length})</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No bookings initialized yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {b.bookingRef}
                        </span>
                        <span className="text-[11px] text-slate-300 block">
                          {b.serviceName} • {b.totalDays} {b.totalDays === 1 ? "day" : "days"}
                        </span>
                        <span className="text-[10px] text-slate-300 block">
                          Address: {b.clientAddress}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-white block">
                          {formatPrice(b.platformBookingFee || hiringFeeUSD(b.engagementType))}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-800/60 inline-block mt-0.5">
                          {b.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Platform Operational Blueprint Note */}
          <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Lock size={14} />
              <span>Herlooku Task Ninja Strict Operational Policies Enforced</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">1. Engagement-Based Hiring Fee</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Daily bookings charge Ksh 1,000; monthly bookings charge Ksh 3,000. The client pays the fee to Herlooku at booking.
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">2. Daily Worker Wage Payout</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Daily wages are collected at booking and held by Herlooku until task completion, then paid to the worker. Monthly employers pay workers directly.
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">3. Strict Zero Direct Comms</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Domestic workers never see client payment numbers. Contact details remain confidential to protect domestic worker safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE EMERGENCY COMMAND CENTER */}
      {/* ========================================================================= */}
      {activeTab === "emergencies" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ShieldAlert size={22} className="text-rose-500 animate-pulse" />
                <span>Incident Command & Case Handling</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time case handling for client–worker incidents: theft, abuse, neglect and misconduct.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Filter:</span>
              <select
                value={emergencyFilter}
                onChange={(e) => setEmergencyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Incidents ({emergencies.length})</option>
                <option value="active">Active Distress ({activeEmergencies.length})</option>
                <option value="resolved">Resolved ({resolvedEmergencies.length})</option>
              </select>
            </div>
          </div>

          {/* Filtered Emergencies List */}
          {emergencies.filter((e) => {
            if (emergencyFilter === "active") return e.status === "active" || e.status === "responding";
            if (emergencyFilter === "resolved") return e.status === "resolved";
            return true;
          }).length === 0 ? (
            <div className="bg-slate-900/60 rounded-3xl p-12 text-center border border-slate-800 space-y-3">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">All Clear</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No incident reports matched your current filter. All workers and client households are operating safely.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {emergencies
                .filter((e) => {
                  if (emergencyFilter === "active") return e.status === "active" || e.status === "responding";
                  if (emergencyFilter === "resolved") return e.status === "resolved";
                  return true;
                })
                .map((alarm) => (
                  <div
                    key={alarm.id}
                    className={`rounded-3xl p-6 shadow-xl space-y-5 border-2 transition-all ${
                      alarm.status === "active"
                        ? "bg-slate-950 border-rose-600 shadow-rose-950/50"
                        : alarm.status === "responding"
                        ? "bg-slate-950 border-amber-500 shadow-amber-950/40"
                        : "bg-slate-900/60 border-slate-800 opacity-80"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                            alarm.alarmType === "theft"
                              ? "bg-rose-600"
                              : alarm.alarmType === "abuse"
                              ? "bg-red-700"
                              : alarm.alarmType === "neglect"
                              ? "bg-amber-600"
                              : "bg-slate-600"
                          }`}
                        >
                          {alarm.alarmType === "theft" ? (
                            <HandCoins size={24} />
                          ) : alarm.alarmType === "abuse" ? (
                            <HeartCrack size={24} />
                          ) : alarm.alarmType === "neglect" ? (
                            <UserX size={24} />
                          ) : (
                            <FileWarning size={24} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white uppercase tracking-wider">
                              {alarm.alarmType.replace("_", " ")} INCIDENT
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                alarm.severity === "critical"
                                  ? "bg-rose-600/30 text-rose-300 border border-rose-500/50"
                                  : "bg-amber-600/30 text-amber-300 border border-amber-500/50"
                              }`}
                            >
                              {alarm.severity}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {alarm.id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium mt-1">
                            Triggered by:{" "}
                            <strong className="text-white">{alarm.raisedByName}</strong> (
                            {alarm.raisedByUserRole}) • Booking Ref:{" "}
                            <span className="text-purple-400 font-mono font-bold">
                              {alarm.bookingRef}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-block ${
                            alarm.status === "active"
                              ? "bg-rose-600 text-white animate-pulse"
                              : alarm.status === "responding"
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {alarm.status === "active"
                            ? "🚨 Active Distress"
                            : alarm.status === "responding"
                            ? "⚠️ Responders En Route"
                            : "✓ Incident Resolved"}
                        </span>
                      </div>
                    </div>

                    {/* Address and Description */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                          Confirmed On-Site Address:
                        </span>
                        <p className="font-bold text-white text-sm leading-snug flex items-start gap-1.5">
                          <MapPin size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          <span>{alarm.location}</span>
                        </p>
                        <span className="text-[10px] text-slate-500 block pt-2 border-t border-slate-800">
                          Alarm Time: {new Date(alarm.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="md:col-span-2 bg-rose-950/30 p-4 rounded-2xl border border-rose-900/40 space-y-2 text-xs">
                        <span className="text-rose-300 font-bold uppercase tracking-wider text-[10px] block">
                          Reported Incident Description:
                        </span>
                        <p className="text-white font-medium text-sm leading-relaxed">
                          &ldquo;{alarm.details}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Admin Response Log & Action Presets */}
                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-300">
                          Incident Dispatch Notes & Log:
                        </label>
                        {alarm.adminNotes && (
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Saved note: &ldquo;{alarm.adminNotes}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="e.g., Contacted both parties / Requested evidence / Pending mediation..."
                          value={alarmNotes[alarm.id] ?? alarm.adminNotes ?? ""}
                          onChange={(e) =>
                            setAlarmNotes({ ...alarmNotes, [alarm.id]: e.target.value })
                          }
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        />

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {alarm.status !== "responding" && alarm.status !== "resolved" && (
                            <button
                              type="button"
                              disabled={alarmUpdating === alarm.id}
                              onClick={() => handleUpdateAlarmStatus(alarm.id, "responding")}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Radio size={14} />
                              <span>Mark Under Review</span>
                            </button>
                          )}

                          {alarm.status !== "resolved" && (
                            <button
                              type="button"
                              disabled={alarmUpdating === alarm.id}
                              onClick={() => handleUpdateAlarmStatus(alarm.id, "resolved")}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Check size={14} />
                              <span>Mark Resolved</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Presets */}
                      {alarm.status !== "resolved" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex-wrap">
                          <span>Quick action templates:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAlarmNotes({
                                ...alarmNotes,
                                [alarm.id]:
                                  "Contacted both client and worker. Parties heard separately. Case under review.",
                              })
                            }
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            + Both Parties Contacted
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAlarmNotes({
                                ...alarmNotes,
                                [alarm.id]:
                                  "Requested photo/video evidence and witness statements from both parties.",
                              })
                            }
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            + Evidence Requested
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAlarmNotes({
                                ...alarmNotes,
                                [alarm.id]:
                                  "Confirmed safe with both household client and domestic helper. Incident resolved and case closed.",
                              })
                            }
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            + Confirmed Safe
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ID VERIFICATION WORKBENCH */}
      {/* ========================================================================= */}
      {activeTab === "verifications" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock size={22} className="text-amber-400" />
                <span>ID Verification Queue & Document Inspection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Inspect government credentials and facial selfie matches to maintain mandatory two-sided trust.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Pending: <span className="text-amber-400">{pendingUsers.length}</span> • Verified:{" "}
                <span className="text-emerald-400">{verifiedUsers.length}</span>
              </span>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-slate-900/60 rounded-3xl p-12 text-center border border-slate-800 space-y-3">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Queue Up To Date</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No pending identity submissions awaiting review. New submissions will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-950 rounded-3xl border-2 border-amber-500/40 p-6 shadow-xl space-y-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.avatar}
                        name={user.name}
                        className="w-14 h-14 rounded-2xl border border-slate-800"
                        textClassName="text-base"
                      />
                      <div>
                        <h3 className="font-bold text-white text-base">{user.name}</h3>
                        <p className="text-xs text-slate-400">
                          {user.email} • {user.phone}
                        </p>
                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 inline-block mt-1">
                          Role: {user.role}
                        </span>
                      </div>
                    </div>
                    <VerificationBadge status={user.idVerificationStatus} size="sm" />
                  </div>

                  {/* Document Metadata */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Document Type:</span>
                      <span className="font-bold text-white uppercase">
                        {user.idType?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">National ID / Passport No:</span>
                      <span className="font-mono font-bold text-white">{user.idNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Submission Timestamp:</span>
                      <span className="text-slate-300">
                        {user.submittedAt ? new Date(user.submittedAt).toLocaleString() : "Recently"}
                      </span>
                    </div>
                  </div>

                  {/* Side-by-Side Inspection Preview */}
                  <div className="grid grid-cols-2 gap-3">
                    {user.idDocumentUrl && (
                      <div className="group relative">
                        <span className="text-[11px] font-bold text-slate-300 block mb-1">
                          Government ID Photo
                        </span>
                        <PrivateDocumentImage
                          path={user.idDocumentUrl}
                          alt="Government ID"
                          onZoom={(url) =>
                            setZoomImage({
                              url,
                              title: `${user.name} - Government ID Inspection`,
                            })
                          }
                        />
                      </div>
                    )}

                    {user.idDocumentBackUrl && (
                      <div className="group relative">
                        <span className="text-[11px] font-bold text-slate-300 block mb-1">
                          Back of Government ID
                        </span>
                        <PrivateDocumentImage
                          path={user.idDocumentBackUrl}
                          alt="Back of Government ID"
                          onZoom={(url) =>
                            setZoomImage({
                              url,
                              title: `${user.name} - Back of Government ID Inspection`,
                            })
                          }
                        />
                      </div>
                    )}

                    {user.selfieUrl && (
                      <div className="group relative">
                        <span className="text-[11px] font-bold text-slate-300 block mb-1">
                          Facial Match Selfie
                        </span>
                        <PrivateDocumentImage
                          path={user.selfieUrl}
                          alt="Selfie"
                          onZoom={(url) =>
                            setZoomImage({
                              url,
                              title: `${user.name} - Facial Match Selfie Inspection`,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleReview(user.id, "approve")}
                      disabled={reviewActionLoading}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve & Verify Identity</span>
                    </button>
                    <button
                      onClick={() => setInspectUser(user)}
                      disabled={reviewActionLoading}
                      className="px-5 py-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-2xl border border-rose-800 transition-all flex items-center gap-1.5"
                    >
                      <XCircle size={16} />
                      <span>Reject...</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BOOKINGS & CONSTANT FEE LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "bookings" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Receipt size={22} className="text-emerald-400" />
                <span>Platform Bookings & Web Owner Fee Ledger</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Daily hires have a Ksh 1,000 fee and wages collected by Herlooku for payout after completion. Monthly hires have a Ksh 3,000 fee; employers pay wages directly.
              </p>
            </div>
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Total Web Owner Fees Collected
              </span>
              <span className="text-lg font-black text-emerald-400">
                {formatPrice(totalPlatformFees)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Booking Ref</th>
                    <th className="px-6 py-4">Service & Address</th>
                    <th className="px-6 py-4">Reserved Dates</th>
                    <th className="px-6 py-4">Hiring Fee</th>
                    <th className="px-6 py-4">Worker Pay</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action / Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 font-mono">
                        <span className="font-bold text-white block">{b.bookingRef}</span>
                        <span className="text-[10px] text-slate-500">ID: {b.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{b.serviceName}</span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {b.clientAddress}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-200 block">
                          {b.startDate} to {b.endDate}
                        </span>
                        <span className="text-[10px] text-purple-400 font-bold">
                          {b.totalDays} {b.totalDays === 1 ? "day exclusive lock" : "days exclusive lock"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-emerald-400 text-sm block">
                          {formatPrice(b.platformBookingFee || hiringFeeUSD(b.engagementType))}
                        </span>
                        <span className="text-[10px] text-slate-500">one-time web owner fee</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-sky-300 block">
                          {b.engagementType === "daily"
                            ? `${formatPrice(b.workerExpectedDailySalary * b.totalDays)} held`
                            : `${formatPrice(b.workerExpectedMonthlySalary || 0)}/month`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.engagementType === "daily"
                            ? b.escrowStatus === "released"
                              ? "paid by Herlooku"
                              : b.status === "completed"
                                ? "payout due after completion"
                                : "held by Herlooku until completion"
                            : "paid directly by employer"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            b.status === "confirmed_exclusive"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : b.status === "pending_payment"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {b.status !== "completed" &&
                          (b.status === "confirmed_exclusive" || b.status === "in_progress") && (
                            <button
                              type="button"
                              disabled={bookingUpdating === b.id}
                              onClick={() => handleBookingAction(b, "complete")}
                              className="rounded-lg bg-sky-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                            >
                              {bookingUpdating === b.id ? "Saving..." : "Mark task complete"}
                            </button>
                          )}
                        {b.engagementType === "daily" &&
                          b.status === "completed" &&
                          b.escrowStatus === "holding" && (
                            <button
                              type="button"
                              disabled={bookingUpdating === b.id}
                              onClick={() => handleBookingAction(b, "mark_worker_paid")}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                            >
                              {bookingUpdating === b.id ? "Saving..." : "Mark worker payout sent"}
                            </button>
                          )}
                        {b.engagementType === "daily" &&
                          b.escrowStatus === "released" && (
                            <span className="text-[10px] font-bold text-emerald-400">
                              Payout sent
                            </span>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: USERS & DOMESTIC WORKERS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Users size={22} className="text-sky-400" />
                <span>All Accounts, Roles & Permissions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Every account on the platform — clients, domestic workers and administrators — including pending and suspended accounts.
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 w-48 sm:w-60"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="worker">Domestic Workers</option>
                <option value="client">Clients</option>
                <option value="admin">Administrators</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">Any Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
                <option value="deleted">Hidden / deleted</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "All Accounts", value: accounts.length, tone: "text-white" },
              { label: "Clients", value: accounts.filter((a) => a.role === "client").length, tone: "text-sky-300" },
              { label: "Domestic Workers", value: accounts.filter((a) => a.role === "worker").length, tone: "text-brand-300" },
              { label: "Administrators", value: adminAccounts.length, tone: "text-purple-300" },
              { label: "Hidden Accounts", value: accounts.filter((a) => Boolean(a.deletedAt)).length, tone: "text-rose-300" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 px-4 py-3"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  {s.label}
                </span>
                <span className={`text-xl font-black ${s.tone}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {!viewerIsSuperAdmin && (
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 flex items-start gap-2">
              <Lock size={14} className="text-purple-400 shrink-0 mt-0.5" />
              <span>
                The main administrator account is protected and cannot be changed from
                this console. You may promote or demote other administrators.
              </span>
            </div>
          )}

          <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div>
              <h3 className="text-sm font-black text-white">Worker Deletion Requests</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Every decision is retained in the audit history. Active bookings and payments must be resolved before approval.
              </p>
            </div>
            {deletionRequests.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-400">
                No pending worker requests.
              </p>
            ) : (
              <div className="space-y-3">
                {deletionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        {request.user?.name || "Worker"}{" "}
                        <span className="font-normal text-slate-400">
                          {request.user?.email}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">{request.reason}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Requested {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={accountActionLoading === request.id}
                        onClick={() =>
                          handleDeletionRequest(
                            request.id,
                            "approve",
                            request.user?.name || "worker",
                          )
                        }
                        className="rounded-lg bg-rose-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        Approve & hide
                      </button>
                      <button
                        type="button"
                        disabled={accountActionLoading === request.id}
                        onClick={() =>
                          handleDeletionRequest(
                            request.id,
                            "reject",
                            request.user?.name || "worker",
                          )
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-200 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <details className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <summary className="cursor-pointer text-xs font-bold text-slate-200">
                Recent deletion audit ({deletionAudit.length})
              </summary>
              <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                {deletionAudit.length === 0 ? (
                  <p className="text-xs text-slate-500">No deletion actions recorded.</p>
                ) : (
                  deletionAudit.map((entry) => (
                    <div key={entry.id} className="border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                      <p className="font-bold text-slate-200">
                        {entry.action.replace(/_/g, " ")} — {entry.target_name} ({entry.target_email})
                      </p>
                      <p>By {entry.actor_name} ({entry.actor_email}) · {new Date(entry.created_at).toLocaleString()}</p>
                      <p>Reason: {entry.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </details>
          </section>

          {/* Accounts Table */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Government ID Info</th>
                    <th className="px-6 py-4">Verification</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Member Since</th>
                    <th className="px-6 py-4">Account Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                        No accounts match these filters.
                      </td>
                    </tr>
                  )}
                  {filteredAccounts.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <Avatar
                          src={u.avatar}
                          name={u.name}
                          className="w-9 h-9 rounded-xl border border-slate-800"
                          textClassName="text-xs"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{u.name}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`capitalize font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                            isSuperAdmin(u.role)
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : u.role === "admin"
                              ? "bg-purple-950 text-purple-300 border border-purple-800"
                              : u.role === "worker"
                              ? "bg-sky-950 text-sky-300 border border-sky-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {isSuperAdmin(u.role) && <Crown size={11} />}
                          {isSuperAdmin(u.role) ? "Main Admin" : u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {u.location || "Nairobi Metro"}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {u.idType ? (
                          <span>
                            <strong className="text-white uppercase">{u.idType}</strong>:{" "}
                            {u.idNumber}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Not submitted</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <VerificationBadge status={u.idVerificationStatus} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            u.deletedAt
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : (u.accountStatus || "pending") === "approved"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : (u.accountStatus || "pending") === "pending"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {u.deletedAt ? "hidden" : u.accountStatus || "pending"}
                        </span>
                        {u.deletedAt && (
                          <span className="mt-1 block max-w-48 text-[10px] text-slate-500">
                            {new Date(u.deletedAt).toLocaleString()}: {u.deletionReason}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-2">
                        {isSuperAdmin(u.role) ? (
                          <span className="text-[10px] font-bold text-amber-300 inline-flex items-center gap-1.5">
                            <Lock size={12} />
                            Protected
                          </span>
                        ) : u.id === currentUser?.id ? (
                          <span className="text-[10px] text-slate-500 italic">
                            Your own account
                          </span>
                        ) : isAdminRole(u.role) ? (
                          <button
                            type="button"
                            disabled={roleUpdating === u.id}
                            onClick={() =>
                              handleChangeRole(
                                u,
                                u.role === "worker" ? "worker" : "client",
                              )
                            }
                            className="rounded-lg bg-rose-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            <ShieldMinus size={12} />
                            {roleUpdating === u.id ? "Saving..." : "Remove admin"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={roleUpdating === u.id}
                            onClick={() => handleChangeRole(u, "admin")}
                            className="rounded-lg bg-purple-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            <ShieldPlus size={12} />
                            {roleUpdating === u.id ? "Granting…" : "Grant admin"}
                          </button>
                        )}
                        {!u.deletedAt &&
                          !isSuperAdmin(u.role) &&
                          u.id !== currentUser?.id && (
                            <button
                              type="button"
                              disabled={accountActionLoading === u.id}
                              onClick={() => handleHideAccount(u)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800 px-3 py-2 text-[10px] font-bold text-rose-300 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              {accountActionLoading === u.id ? "Saving..." : "Hide account"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIGH-RES IMAGE ZOOM MODAL */}
      {/* ========================================================================= */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-950 rounded-3xl p-6 max-w-2xl w-full border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{zoomImage.title}</h3>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-900"
              >
                ✕ Close
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-[70vh] flex items-center justify-center bg-black">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECTION REASON MODAL */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-slate-800 text-slate-100">
            <h3 className="text-base font-bold text-white">
              Reject Verification for {inspectUser.name}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please specify the precise reason for rejection so the user receives clear compliance feedback to re-submit valid credentials.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Rejection Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl p-3 focus:outline-none text-white"
              >
                <option value="Image is blurry and document text is illegible">
                  Image is blurry and document text is illegible
                </option>
                <option value="Facial selfie does not match government ID photo">
                  Facial selfie does not match government ID photo
                </option>
                <option value="Document has expired or is invalid">
                  Document has expired or is invalid
                </option>
                <option value="Name on ID does not match account name">
                  Name on ID does not match account name
                </option>
                <option value="ID photo is partially cut off or covered">
                  ID photo is partially cut off or covered
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewActionLoading}
                onClick={() => handleReview(inspectUser.id, "reject")}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {reviewActionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading admin dashboard...</p>
        </div>
      }
    >
      <AdminDashboardPage />
    </Suspense>
  );
}
