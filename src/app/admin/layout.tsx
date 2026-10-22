"use client";

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
  Settings,
} from "lucide-react";
import { User } from "@/types";
import { Avatar } from "@/components/Avatar";

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
      label: "Incident Command",
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
      label: "All Accounts & Roles",
      href: "/admin?tab=users",
      icon: Users,
      active: false,
    },
    {
      label: "Administrator Profile",
      href: "/admin/profile",
      icon: Settings,
      active: pathname === "/admin/profile",
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
                Herlooku Task Ninja
              </span>
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                Trust & Operations Hub
              </span>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                className="w-9 h-9 rounded-xl border border-purple-500/40"
                textClassName="text-xs"
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
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      item.active
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={item.active ? "text-white" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor}`}
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
