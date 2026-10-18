"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Edit,
  DollarSign,
  FileCheck,
  ExternalLink,
  ShieldAlert,
  Coins,
  Settings,
} from "lucide-react";
import { User, WorkerProfile } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

export default function WorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.activeUser);
        if (data.activeUser?.role === "worker") {
          const wrkRes = await fetch(`/api/workers/${data.activeUser.id}`);
          if (wrkRes.ok) {
            const wrkData = await wrkRes.json();
            setWorkerProfile(wrkData.profile);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUser();
    const handleAuth = () => fetchUser();
    window.addEventListener("auth-changed", handleAuth);
    return () => window.removeEventListener("auth-changed", handleAuth);
  }, []);

  const navItems = [
    {
      label: "Exclusive Hire Schedule",
      href: "/dashboard/worker",
      icon: Calendar,
      active: pathname === "/dashboard/worker",
    },
    {
      label: "Edit Profile & Daily Pay",
      href: "/dashboard/worker/profile",
      icon: Edit,
      active: pathname === "/dashboard/worker/profile",
    },
    {
      label: "Worker ID Verification",
      href: "/verify-id",
      icon: FileCheck,
      active: pathname === "/verify-id",
    },
    {
      label: "Account & Security",
      href: "/dashboard/worker/account",
      icon: Settings,
      active: pathname === "/dashboard/worker/account",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-brand-50/50 via-sky-50/30 to-transparent flex flex-col md:flex-row">
      {/* Worker Sidebar */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl md:border-r border-b md:border-b-0 border-sky-100 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Worker Profile Header Badge */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <Avatar
              src={
                currentUser?.avatar ||
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
              }
              name={currentUser?.name || tx("Domestic Worker")}
              className="w-12 h-12 rounded-2xl border-2 border-brand-300 shadow-sm"
              textClassName="text-base"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 block truncate">
                {currentUser?.name || tx("Domestic Worker")}
              </span>
              <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider block">
                {t("portals.worker")}
              </span>
              {currentUser && (
                <div className="mt-1">
                  <VerificationBadge status={currentUser.idVerificationStatus} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Hire Fee Pill */}
          {/* Quick Daily Pay Pill */}
          {workerProfile && (
            <div className="p-3 bg-gradient-to-br from-brand-50 to-sky-50 border border-sky-200 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] text-sky-800 font-bold uppercase tracking-wide block">
                {tx("Your Stated Daily Pay")}
              </span>
              <span className="text-base font-black text-slate-900">
                {formatPrice(workerProfile.expectedDailySalary || 8)}
                <span className="text-xs text-slate-500 font-medium">{tx(" / day expected")}</span>
              </span>
              <span className="text-[10px] text-sky-700 block">{tx("paid directly by household")}</span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    item.active
                      ? "bg-brand-600 text-white shadow-glow-brand"
                      : "text-slate-600 hover:bg-brand-50 hover:text-brand-900"
                  }`}
                >
                  <Icon size={16} className={item.active ? "text-white" : "text-slate-400"} />
                  <span>{tx(item.label)}</span>
                </Link>
              );
            })}

            {currentUser && (
              <Link
                href={`/workers/${currentUser.id}`}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              >
                <ExternalLink size={15} />
                <span>{tx("View Public Card")}</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Worker Safety Policy Notice */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">{tx("Safety & Off-Platform Policy")}</span>
            <p className="leading-relaxed">
              {tx("Clients do not have your direct phone number. Herlooku Task Ninja exclusively locks your schedule when booked. Households pay your stated daily pay directly to you at the end of each work day.")}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
