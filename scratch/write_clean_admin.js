const fs = require('fs');
const path = require('path');

const root = 'c:/Users/FalamaS/Herlooku';

// 1. Clean src/app/admin/layout.tsx
const cleanLayout = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Clock,
  Users,
  Lock,
  ExternalLink,
  ShieldAlert,
  Receipt,
  Headphones,
} from "lucide-react";
import { User } from "@/types";

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeAlarmCount, setActiveAlarmCount] = useState<number>(0);
  const [bookingCount, setBookingCount] = useState<number>(0);

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const data = await authRes.json();
        setCurrentUser(data.activeUser);
      }

      const verRes = await fetch("/api/verification");
      if (verRes.ok) {
        const verData = await verRes.json();
        setPendingCount(verData.pendingVerifications?.length || 0);
      }

      const emRes = await fetch("/api/emergencies");
      if (emRes.ok) {
        const emData = await emRes.json();
        const active = (emData.alarms || []).filter(
          (a: any) => a.status === "active" || a.status === "responding"
        );
        setActiveAlarmCount(active.length);
      }

      const bkgRes = await fetch("/api/bookings");
      if (bkgRes.ok) {
        const bkgData = await bkgRes.json();
        setBookingCount(bkgData.bookings?.length || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const handleAuth = () => fetchData();
    window.addEventListener("auth-changed", handleAuth);
    const interval = setInterval(fetchData, 15000);
    return () => {
      window.removeEventListener("auth-changed", handleAuth);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      label: "Executive Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Live Emergency Command",
      href: "/admin?tab=emergencies",
      icon: ShieldAlert,
      active: false,
      badge: activeAlarmCount > 0 ? activeAlarmCount : null,
      badgeColor: "bg-rose-600 text-white animate-pulse",
    },
    {
      label: "ID Verification Queue",
      href: "/admin/verifications",
      icon: Clock,
      active: pathname === "/admin/verifications",
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      label: "Platform Bookings Ledger",
      href: "/admin?tab=bookings",
      icon: Receipt,
      active: false,
      badge: bookingCount > 0 ? bookingCount : null,
      badgeColor: "bg-slate-800 text-slate-400",
    },
    {
      label: "Community Directory",
      href: "/admin?tab=users",
      icon: Users,
      active: false,
    },
    {
      label: "Public Marketplace",
      href: "/workers",
      icon: ExternalLink,
      active: false,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-slate-900/90 border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800/80">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-600/25">
              <ShieldCheck size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black text-white block truncate tracking-tight">
                Herlooku Command
              </span>
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                Trust & Operations Hub
              </span>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover border border-purple-500/40"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Active Administrator
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block px-3 pb-1">
              Management Modules
            </span>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={\`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all \${
                      item.active
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={item.active ? "text-white" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={\`text-[10px] font-black px-2 py-0.5 rounded-full \${item.badgeColor}\`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <div className="p-3.5 bg-purple-950/20 border border-purple-500/20 rounded-2xl text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <Lock size={13} className="text-purple-400" />
              <span>Two-Sided ID Mandate Active</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Unverified domestic workers are strictly hidden from search. Clients must hold verified government ID to lock a calendar.
            </p>
          </div>

          <div className="px-1 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Headphones size={12} />
              <span>Nairobi Dispatch Desk</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">24/7 Priority</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-5 sm:p-8 overflow-y-auto bg-slate-950">{children}</main>
    </div>
  );
}
`;

fs.writeFileSync(path.join(root, 'src/app/admin/layout.tsx'), cleanLayout, 'utf8');
console.log('✓ Wrote clean src/app/admin/layout.tsx');

// 2. Clean src/app/admin/verifications/page.tsx
const cleanVerifications = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Maximize2,
  ChevronLeft,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { User } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useCurrency } from "@/context/CurrencyContext";

export default function AdminVerificationsPage() {
  const { formatPrice } = useCurrency();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [activeQueueTab, setActiveQueueTab] = useState<"pending" | "verified" | "rejected">(
    "pending"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal / Review state
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    "Image is blurry and document text is illegible"
  );
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      setCurrentUser(authData.activeUser);

      const verRes = await fetch("/api/verification");
      if (verRes.ok) {
        const verData = await verRes.json();
        setPendingUsers(verData.pendingVerifications || []);
        setVerifiedUsers(verData.verifiedUsers || []);
        setRejectedUsers(verData.rejectedUsers || []);
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
          text: \`ID verification successfully \${decision === "approve" ? "APPROVED" : "REJECTED"} for user.\`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const currentList =
    activeQueueTab === "pending"
      ? pendingUsers
      : activeQueueTab === "verified"
      ? verifiedUsers
      : rejectedUsers;

  const filteredList = currentList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.idNumber && u.idNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Back to Command Overview</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Two-Sided ID Verification Workbench</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
            Audit national ID credentials and live selfies for both domestic helpers and household clients before platform booking locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <LayoutDashboard size={15} />
            <span>Command Center</span>
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={\`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-lg \${
            feedback.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
              : "bg-rose-950/90 text-rose-300 border border-rose-800"
          }\`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveQueueTab("pending")}
            className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 \${
              activeQueueTab === "pending"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }\`}
          >
            <Clock size={14} />
            <span>Pending Submissions</span>
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveQueueTab("verified")}
            className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 \${
              activeQueueTab === "verified"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }\`}
          >
            <ShieldCheck size={14} />
            <span>Verified Credentials ({verifiedUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveQueueTab("rejected")}
            className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 \${
              activeQueueTab === "rejected"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }\`}
          >
            <XCircle size={14} />
            <span>Rejected Submissions ({rejectedUsers.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-8 pr-3 py-2 focus:outline-none w-56"
          />
        </div>
      </div>

      {/* Queue Content */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-900/60 rounded-3xl p-12 text-center border border-slate-800 space-y-2">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No submissions found</h3>
          <p className="text-xs text-slate-400">
            No identity submissions currently in this category matching your search.
          </p>
        </div>
      ) : activeQueueTab === "pending" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredList.map((user) => (
            <div
              key={user.id}
              className="bg-slate-950 rounded-3xl border-2 border-amber-500/40 p-6 shadow-xl space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-800"
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

              {/* Document details */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Type:</span>
                  <span className="font-bold text-white uppercase">
                    {user.idType?.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ID / Passport Number:</span>
                  <span className="font-mono font-bold text-white">{user.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted Timestamp:</span>
                  <span className="text-slate-300">
                    {user.submittedAt ? new Date(user.submittedAt).toLocaleString() : "Recently"}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Images Preview */}
              <div className="grid grid-cols-2 gap-3">
                {user.idDocumentUrl && (
                  <div className="group relative">
                    <span className="text-[11px] font-bold text-slate-300 block mb-1">
                      Government ID Photo
                    </span>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
                      <img
                        src={user.idDocumentUrl}
                        alt="Government ID"
                        className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setZoomImage({
                            url: user.idDocumentUrl!,
                            title: \`\${user.name} - Government ID\`,
                          })
                        }
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {user.selfieUrl && (
                  <div className="group relative">
                    <span className="text-[11px] font-bold text-slate-300 block mb-1">
                      Facial Match Selfie
                    </span>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
                      <img
                        src={user.selfieUrl}
                        alt="Selfie"
                        className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setZoomImage({
                            url: user.selfieUrl!,
                            title: \`\${user.name} - Facial Match Selfie\`,
                          })
                        }
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
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
                  <span>Approve & Verify</span>
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
      ) : (
        <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">ID Type & Number</th>
                  <th className="px-6 py-4">Verification Status</th>
                  <th className="px-6 py-4">Action / Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-800"
                      />
                      <div>
                        <span className="font-bold text-white block">{u.name}</span>
                        <span className="text-[11px] text-slate-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-800 text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {u.idType ? (
                        <span>
                          <strong className="text-white uppercase">{u.idType}</strong>: {u.idNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not available</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <VerificationBadge status={u.idVerificationStatus} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {u.verifiedAt
                        ? \`Verified: \${new Date(u.verifiedAt).toLocaleDateString()}\`
                        : u.submittedAt
                        ? \`Submitted: \${new Date(u.submittedAt).toLocaleDateString()}\`
                        : "Active"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High-Res Zoom Modal */}
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

      {/* Reject Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-slate-800 text-slate-100">
            <h3 className="text-base font-bold text-white">
              Reject Verification for {inspectUser.name}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please specify the precise reason for rejecting this identity document so the user receives clear compliance instructions.
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
`;

fs.writeFileSync(path.join(root, 'src/app/admin/verifications/page.tsx'), cleanVerifications, 'utf8');
console.log('✓ Wrote clean src/app/admin/verifications/page.tsx');

