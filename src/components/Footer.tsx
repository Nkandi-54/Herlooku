"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  HeartHandshake,
  Sparkles,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { NinjaAvatar } from "./NinjaAvatar";
import { useLanguage } from "@/i18n/LanguageContext";

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  const trustItems = [
    { icon: ShieldCheck, label: t("trust.twoSidedId") },
    { icon: Lock, label: t("trust.directTill") },
    { icon: CheckCircle2, label: t("trust.zeroDoubleBooking") },
    { icon: HeartHandshake, label: t("trust.trustAndSafety") },
  ];

  const serviceLinks: [string, string][] = [
    [t("nav.shop"), "/shop"],
    [t("footer.services.childcare"), "/workers?service=Childcare"],
    [t("footer.services.housekeeping"), "/workers?service=Housekeeping"],
    [t("footer.services.cooking"), "/workers?service=Cooking"],
    [t("footer.services.elderlyCare"), "/workers?service=Elderly%20Care"],
    [t("footer.services.deepCleaning"), "/workers?service=Deep%20Cleaning"],
  ];

  const platformLinks: [string, string][] = [
    [t("footer.platform.browseHelpers"), "/workers"],
    [t("footer.platform.howItWorks"), "/#how-it-works"],
    [t("footer.platform.idVerification"), "/verify-id"],
    [t("footer.platform.clientPortal"), "/dashboard/client"],
    [t("footer.platform.workerPortal"), "/dashboard/worker"],
    // Admin console is English-only by policy, so this key is never Swahili.
    [t("footer.platform.adminConsole"), "/admin"],
  ];

  return (
    <footer className="relative mt-20 bg-ink text-slate-300 overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/4 w-[36rem] h-[36rem] rounded-full bg-brand-600/10 blur-[120px] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none"
      />

      {/* Trust band */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-brand-300" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 leading-tight">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-white/10">
          {/* Brand + newsletter */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2.5">
              <NinjaAvatar className="w-10 h-10 rounded-2xl" glyphClassName="w-6 h-6" animated />
              <div className="leading-none">
                <span className="text-xl font-black text-white tracking-tight flex items-center gap-1">
                  Her<span className="text-brand-400">looku</span>
                  <span className="inline-flex items-center rounded-md bg-gradient-to-tr from-brand-600 to-brand-500 px-1.5 py-[3px] text-[9px] font-black uppercase tracking-[0.12em] text-white leading-none">
                    Task Ninja
                  </span>
                </span>
                <span className="text-[9px] tracking-[0.2em] text-slate-400 font-bold uppercase block mt-0.5">
                  {t("common.brandTagline")}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {t("footer.blurb")}
            </p>

            {/* Trust & Safety contact */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand-400" />
                {t("footer.trustUpdates")}
              </span>
              <a
                href="mailto:herlookutaskninja@gmail.com?subject=Trust%20and%20Safety%20updates"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t("footer.getInTouch")}
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.16em] mb-4">
              {t("footer.servicesHeading")}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {serviceLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="hover:text-brand-300 transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-brand-400 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.16em] mb-4">
              {t("footer.platformHeading")}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {platformLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="hover:text-brand-300 transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-600 group-hover:bg-brand-400 transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.16em]">
              {t("footer.getInTouch")}
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2.5">
                <MapPin size={14} className="text-brand-400 shrink-0" />
                <span>{t("footer.location")}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="text-brand-400 shrink-0" />
                <a
                  href="mailto:herlookutaskninja@gmail.com"
                  className="hover:text-brand-300 transition-colors"
                >
                  herlookutaskninja@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-brand-400 shrink-0" />
                <span>{t("footer.emergencyLine")}</span>
                <a
                  href="tel:+254740042359"
                  className="hover:text-brand-300 transition-colors"
                >
                  +254 740 042359
                </a>
              </li>
            </ul>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1.5">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} />
                {t("footer.zeroBookingGuarantee")}
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t("footer.zeroBookingBody")}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <Link
              href="/verify-id"
              className="hover:text-brand-300 transition-colors"
            >
              {t("footer.verificationPolicy")}
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-brand-300 transition-colors"
            >
              {t("footer.bookingTerms")}
            </Link>
            <Link
              href="/admin"
              className="hover:text-brand-300 transition-colors"
            >
              {t("footer.platform.adminConsole")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
