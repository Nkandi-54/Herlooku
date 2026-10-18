"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Search,
  Home,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { User } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.activeUser);
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
      label: "My Exclusive Hires",
      href: "/dashboard/client",
      icon: Calendar,
      active: pathname === "/dashboard/client",
    },
    {
      label: "Edit Household Profile",
      href: "/dashboard/client/profile",
      icon: UserIcon,
      active: pathname === "/dashboard/client/profile",
    },
    {
      label: "Browse Househelps",
      href: "/workers",
      icon: Search,
      active: pathname === "/workers",
    },
    {
      label: "ID Verification",
      href: "/verify-id",
      icon: FileCheck,
      active: pathname === "/verify-id",
    },
    {
      label: "Account & Security",
      href: "/dashboard/client/account",
      icon: Settings,
      active: pathname === "/dashboard/client/account",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-brand-50/50 via-sky-50/30 to-transparent flex flex-col md:flex-row">
      {/* Client Sidebar */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl md:border-r border-b md:border-b-0 border-slate-200/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Client Profile Header Badge */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <Avatar
              src={
                currentUser?.avatar ||
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
              }
              name={currentUser?.name || tx("Household Client")}
              className="w-12 h-12 rounded-2xl border border-slate-200 shadow-sm"
              textClassName="text-base"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 block truncate">
                {currentUser?.name || tx("Household Client")}
              </span>
              <span className="text-[10px] text-brand-700 font-bold uppercase tracking-wider block">
                {tx("Client Portal")}
              </span>
              {currentUser && (
                <div className="mt-1">
                  <VerificationBadge status={currentUser.idVerificationStatus} size="sm" />
                </div>
              )}
            </div>
          </div>

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
                      : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  <Icon size={16} className={item.active ? "text-white" : "text-slate-400"} />
                  <span>{tx(item.label)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Support & Guarantee Card */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
          <div className="p-3.5 bg-gradient-to-br from-brand-50 to-sky-50 border border-brand-200/70 rounded-2xl text-[11px] space-y-1.5">
            <span className="font-bold text-brand-900 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-600" />
              <span>{tx("Direct Till Verification Guarantee")}</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              {tx("Your one-time hire fee of Ksh 3,000 is verified by M-Pesa before your helper arrives and commences duties.")}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
