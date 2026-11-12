"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  LogOut,
  UserPlus,
  LogIn,
  ChevronDown,
  Search,
  Check,
  Settings,
} from "lucide-react";
import { User, isAdminRole } from "@/types";
import { Avatar } from "./Avatar";
import { CurrencySelector } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

const ROLE_META: Record<string, { labelKey: string; color: string; dot: string; chip: string }> = {
  client: { labelKey: "roles.client", color: "text-sky-700", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  worker: { labelKey: "roles.worker", color: "text-brand-700", dot: "bg-brand-600", chip: "bg-brand-50 text-brand-700 border-brand-200" },
  admin:  { labelKey: "roles.admin",  color: "text-blue-700", dot: "bg-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200" },
};

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Auth ─────────────────────────────────── */
  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data.activeUser ?? null);
      }
    } catch { /* silently ignore */ }
  };

  useEffect(() => {
    fetchUser();
    window.addEventListener("auth-changed", fetchUser);
    return () => window.removeEventListener("auth-changed", fetchUser);
  }, []);

  /* ── Scroll condensing ─────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Close drawers on nav ──────────────────── */
  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [pathname]);

  /* ── Close profile dropdown on outside click ─ */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Escape closes any open panel ──────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setProfileOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── Logout ────────────────────────────────── */
  const handleLogout = async () => {
    setProfileOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    setActiveUser(null);
    window.dispatchEvent(new Event("auth-changed"));
    router.push("/login");
  };

  /* ── Derived helpers ───────────────────────── */
  /* The admin console is an internal operator surface and is pinned to English;
     hide the language switcher and never localise its chrome. */
  const isAdminRoute = pathname.startsWith("/admin");

  const activeIsAdmin = isAdminRole(activeUser?.role);

  const portalHref = !activeUser
    ? "/dashboard/client"
    : activeIsAdmin ? "/admin"
    : activeUser.role === "worker" ? "/dashboard/worker"
    : "/dashboard/client";

  const portalLabel = activeIsAdmin ? t("portals.admin")
    : activeUser?.role === "worker" ? t("portals.worker")
    : t("portals.client");

  const profileHref = activeIsAdmin ? "/admin/profile"
    : activeUser?.role === "worker" ? "/dashboard/worker/profile"
    : "/dashboard/client/profile";

  // Account & security (change password) only exists for the two dashboards,
  // so admins fall back to their profile page rather than a 404.
  const accountHref = activeIsAdmin ? "/admin/profile"
    : activeUser?.role === "worker" ? "/dashboard/worker/account"
    : "/dashboard/client/account";

  const roleMeta = activeUser ? (ROLE_META[activeUser.role] ?? ROLE_META.client) : null;
  const isPortalActive = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  const navLinks = [
    { label: t("nav.browseHelpers"), href: "/workers", active: (p: string) => p.startsWith("/workers") },
    { label: t("nav.shop"), href: "/shop", active: (p: string) => p.startsWith("/shop") },
    { label: t("nav.howItWorks"),  href: "/#how-it-works", active: () => false },
    { label: t("common.idVerification"), href: "/verify-id", active: (p: string) => p === "/verify-id" },
  ];

  const navLinkCls = (isActive: boolean) =>
    `relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 whitespace-nowrap
     ${isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <header className="sticky top-0 z-40">
      {/* ── Main bar ─────────────────────────────── */}
      <div
        className={`relative border-b transition-shadow duration-200 ${
          scrolled ? "bg-white border-slate-200 shadow-sm" : "bg-white border-slate-100"
        }`}
      >
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? "h-14" : "h-16"}`}>

            {/* ── Logo ───────────────────────────────── */}
            <Link href="/" className="flex items-center shrink-0" aria-label="Herlooku Task Ninja home">
              <Image
                src="/herlooku-brand.png"
                alt="Herlooku Task Ninja"
                width={440}
                height={290}
                priority
                className="h-14 w-[84px] object-contain sm:h-16 sm:w-24"
              />
            </Link>

            {/* ── Desktop nav (centred) ──────────────── */}
            <nav className="hidden md:flex items-center gap-0.5 mx-auto">
              {navLinks.map((l) => {
                const isActive = l.active(pathname);
                return (
                  <Link key={l.href} href={l.href} className={navLinkCls(isActive)}>
                    {l.label}
                    <span
                      className={`absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 rounded-full bg-brand-700 transition-all duration-200 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </Link>
                );
              })}
              {activeUser && (
                <Link
                  href={portalHref}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors duration-200 ${
                    isPortalActive
                      ? "text-brand-800 bg-brand-50 border border-brand-200"
                      : "text-slate-600 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <LayoutDashboard size={13} className="shrink-0" />
                  <span>{portalLabel}</span>
                </Link>
              )}
            </nav>

            {/* ── Right side — desktop ───────────────── */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {!isAdminRoute && <LanguageSwitcher />}
              <CurrencySelector />

              {activeUser ? (
                /* ── Consolidated account menu ── */
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    aria-expanded={profileOpen}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors duration-200 group"
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={activeUser.avatar}
                        name={activeUser.name}
                        className="w-7 h-7 rounded-full ring-2 ring-white group-hover:ring-brand-300 transition-all"
                        textClassName="text-[10px]"
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${roleMeta?.dot ?? "bg-brand-500"}`} />
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${roleMeta?.chip}`}>
                      {roleMeta ? t(roleMeta.labelKey) : ""}
                    </span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${profileOpen ? "rotate-180 text-slate-900" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                      <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50">
                        <Avatar
                          src={activeUser.avatar}
                          name={activeUser.name}
                          className="w-11 h-11 rounded-xl ring-1 ring-slate-200"
                          textClassName="text-sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{activeUser.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{activeUser.email}</p>
                          <span className={`mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${roleMeta?.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${roleMeta?.dot}`} />
                            {roleMeta ? t(roleMeta.labelKey) : ""}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200" />

                      <div className="p-1.5 space-y-0.5">
                        <Link href={portalHref} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                          <LayoutDashboard size={14} /> {portalLabel}
                        </Link>
                        <Link href={profileHref} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                          <Avatar src={activeUser.avatar} name={activeUser.name} className="w-3.5 h-3.5 rounded-full" textClassName="text-[6px]" />
                          {t("nav.viewProfile")}
                        </Link>
                        <Link href={accountHref} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                          <Settings size={14} />
                          {t("nav.accountSecurity")}
                        </Link>
                        <Link href="/verify-id" className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                          <span className="flex items-center gap-2.5">
                            <ShieldCheck size={14} />
                            {t("common.idVerification")}
                          </span>
                          {activeUser.idVerificationStatus === "verified" ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-sky-700">
                              <Check size={11} /> {t("common.verified")}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase text-amber-700">{t("common.actionNeeded")}</span>
                          )}
                        </Link>
                      </div>

                      <div className="h-px bg-slate-200" />

                      <div className="p-1.5">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut size={14} />
                          {t("common.logOut")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Logged-out: Login + Sign Up ─────── */
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-all"
                  >
                    <LogIn size={13} />
                    {t("common.logIn")}
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold transition-colors"
                  >
                    <UserPlus size={13} />
                    {t("common.signUp")}
                  </Link>
                </div>
              )}
            </div>

            {/* ── Right side — mobile ─────────────────── */}
            <div className="flex lg:hidden items-center gap-2 shrink-0">
              <Link
                href="/workers"
                aria-label={t("nav.browseHelpersAria")}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Search size={18} />
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t("nav.toggleNavAria")}
                aria-expanded={mobileOpen}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────── */}
      {/* Keep the drawer scrollable on short screens so every navigation item remains reachable. */}
      <div className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${mobileOpen ? "max-h-[calc(100dvh-3.5rem)] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-5 space-y-1.5 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain">
          {/* Account card first — most important on small screens */}
          {activeUser ? (
            <Link
              href={profileHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors mb-2"
            >
              <div className="relative shrink-0">
                <Avatar src={activeUser.avatar} name={activeUser.name} className="w-10 h-10 rounded-xl" textClassName="text-sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${roleMeta?.dot ?? "bg-brand-500"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold text-slate-900 block truncate">{activeUser.name}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${roleMeta?.color ?? "text-brand-400"}`}>
                  {roleMeta ? t(roleMeta.labelKey) : ""}
                  {activeUser.idVerificationStatus === "verified"
                    ? ` · ${t("common.verified")}`
                    : ` · ${t("common.unverified")}`}
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                <LogIn size={15} />
                {t("common.logIn")}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-700 text-white text-xs font-semibold hover:bg-brand-800 transition-colors"
              >
                <UserPlus size={15} />
                {t("common.signUp")}
              </Link>
            </div>
          )}

          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                l.active(pathname)
                  ? "bg-brand-50 text-brand-800 border border-brand-200"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span>{l.label}</span>
              <ChevronRight size={14} className="text-slate-500" />
            </Link>
          ))}

          {activeUser && (
            <Link
              href={portalHref}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isPortalActive
                  ? "bg-brand-50 text-brand-800 border border-brand-200"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span className="flex items-center gap-2"><LayoutDashboard size={15} />{portalLabel}</span>
              <ChevronRight size={14} className="text-slate-500" />
            </Link>
          )}

          {activeUser && (
            <Link
              href={accountHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent transition-colors"
            >
              <span className="flex items-center gap-2"><Settings size={15} />{t("nav.accountSecurity")}</span>
              <ChevronRight size={14} className="text-slate-500" />
            </Link>
          )}

          <div className="h-px bg-slate-200 my-2.5" />

          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t("common.currency")}</span>
            <CurrencySelector />
          </div>

          {!isAdminRoute && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t("common.language")}</span>
              <LanguageSwitcher />
            </div>
          )}

          {activeUser && (
            <button
              onClick={handleLogout}
              className="mt-1 flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={14} />
              {t("common.logOut")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
