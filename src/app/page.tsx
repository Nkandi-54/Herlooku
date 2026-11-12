"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  Star,
  Search,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  Baby,
  ChefHat,
  SprayCan,
  HeartPulse,
  Shirt,
  Wrench,
  Refrigerator,
  Microwave,
  Cog,
  CarFront,
  Droplets,
  Zap,
  Hammer,
  Paintbrush,
  Wind,
  Plus,
  Minus,
  CreditCard,
} from "lucide-react";
import {
  WorkerProfile,
  User,
  DAILY_HIRING_FEE_USD,
  MONTHLY_HIRING_FEE_USD,
} from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

const CATEGORIES = [
  {
    label: "Childcare & Nanny",
    value: "Childcare",
    icon: Baby,
    blurb: "Infant & toddler care",
  },
  {
    label: "Cooking & Chef",
    value: "Cooking",
    icon: ChefHat,
    blurb: "Daily meal prep",
  },
  {
    label: "Housekeeping",
    value: "Housekeeping",
    icon: SprayCan,
    blurb: "Full-home upkeep",
  },
  {
    label: "Deep Cleaning",
    value: "Deep Cleaning",
    icon: Sparkles,
    blurb: "Top-to-bottom reset",
  },
  {
    label: "Elderly Care",
    value: "Elderly Care",
    icon: HeartPulse,
    blurb: "Companion support",
  },
  {
    label: "Laundry & Ironing",
    value: "Laundry",
    icon: Shirt,
    blurb: "Delicate fabric care",
  },
  {
    label: "Yard & Maintenance",
    value: "Yard Care",
    icon: Wrench,
    blurb: "Outdoor upkeep",
  },
  {
    label: "Refrigerator Repair",
    value: "Refrigerator Repair",
    icon: Refrigerator,
    blurb: "Fridge troubleshooting & repair",
  },
  {
    label: "Microwave Repair",
    value: "Microwave Repair",
    icon: Microwave,
    blurb: "Microwave diagnostics & repair",
  },
  {
    label: "Appliance Repair",
    value: "Appliance Repair",
    icon: Wrench,
    blurb: "Repair other household appliances",
  },
  {
    label: "Mechanical Repairs",
    value: "Mechanical Repairs",
    icon: Cog,
    blurb: "Mechanical maintenance & repairs",
  },
  {
    label: "Automotive Repair",
    value: "Automotive Repair",
    icon: CarFront,
    blurb: "Vehicle maintenance & repairs",
  },
  {
    label: "Plumbing",
    value: "Plumbing",
    icon: Droplets,
    blurb: "Pipes, taps & water systems",
  },
  {
    label: "Electrical Repairs",
    value: "Electrical Repairs",
    icon: Zap,
    blurb: "Electrical troubleshooting & repair",
  },
  {
    label: "Carpentry",
    value: "Carpentry",
    icon: Hammer,
    blurb: "Furniture, doors & woodwork",
  },
  {
    label: "Painting",
    value: "Painting",
    icon: Paintbrush,
    blurb: "Interior & exterior painting",
  },
  {
    label: "Air Conditioning Repair",
    value: "Air Conditioning Repair",
    icon: Wind,
    blurb: "AC servicing & repair",
  },
  {
    label: "General Repairs",
    value: "General Repairs",
    icon: Wrench,
    blurb: "Handyman help around the home",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Complete identity verification",
    body: "Clients and workers verify their identity before a booking is placed.",
    icon: UserCheck,
  },
  {
    n: "02",
    title: "Compare worker profiles",
    body: "Review services, experience, location and listed availability.",
    icon: Search,
  },
  {
    n: "03",
    title: "Review the booking details",
    body: "Check the dates, hiring fee and payment terms before you request a booking.",
    icon: CreditCard,
  },
  {
    n: "04",
    title: "Send your booking request",
    body: "Choose a service and dates, then follow the checkout instructions to complete your request.",
    icon: CheckCircle2,
  },
];

const FAQS = [
  {
    q: "Why must both clients and workers verify their ID?",
    a: "Identity verification is required before a booking and helps both sides confirm who they are working with.",
  },
  {
    q: "Where can I see the hiring fee?",
    a: "The fee is shown with the booking details before you submit a request. Daily and monthly bookings have different fees.",
  },
  {
    q: "How do I compare workers?",
    a: "Review each profile's services, experience, location, listed availability and reviews when available.",
  },
  {
    q: "Can I book without identity verification?",
    a: "No. Clients and workers need to complete identity verification before a booking can be placed.",
  },
  {
    q: "What happens if something goes wrong during a placement?",
    a: "You can submit an incident report from your dashboard for the Herlooku team to review.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);
  const [featuredWorkers, setFeaturedWorkers] = useState<
    (WorkerProfile & { user: User })[]
  >([]);
  const [featuredWorkersLoading, setFeaturedWorkersLoading] = useState(true);
  const [featuredWorkersError, setFeaturedWorkersError] = useState(false);
  const [selectedService, setSelectedService] = useState("All");
  const [searchLocation, setSearchLocation] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    const loadFeaturedWorkers = async () => {
      try {
        const response = await fetch("/api/workers");
        if (!response.ok) {
          throw new Error(`Could not load worker profiles (${response.status}).`);
        }
        const data = await response.json();
        if (active && Array.isArray(data.profiles)) {
          setFeaturedWorkers(data.profiles.slice(0, 3));
        }
      } catch (error) {
        console.error("Could not load featured worker profiles.", error);
        if (active) setFeaturedWorkersError(true);
      } finally {
        if (active) setFeaturedWorkersLoading(false);
      }
    };
    void loadFeaturedWorkers();
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedService !== "All") params.set("service", selectedService);
    if (searchLocation) params.set("search", searchLocation);
    router.push(`/workers?${params.toString()}`);
  };

  return (
    <div className="pb-4">
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-[42%] bg-ink-soft lg:block"
        />
        {/* Faded brand watermark in the hero background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end opacity-[0.08] select-none"
        >
          <Image
            src="/herlooku-brand.png"
            alt=""
            width={560}
            height={560}
            priority={false}
            className="-mr-16 h-auto w-[28rem] max-w-none lg:w-[36rem]"
          />
        </div>
        <div className="section relative grid min-h-[34rem] items-center gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:py-20">
          <div className="space-y-7 lg:col-span-6">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-300">
              <span className="h-px w-8 bg-brand-400" />
              {tx("Household services from Herlooku")}
            </p>
            <h1 className="display-1 max-w-xl text-4xl leading-[1.05] sm:text-5xl lg:text-[3.6rem]">
              {tx("Find household help, with details you can compare.")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {tx("Compare worker profiles, services and listed availability. Review the hiring fee before you request a booking.")}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/workers"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-400 px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-brand-300"
              >
                {tx("Browse helpers")}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t("nav.howItWorks")}
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-xs font-medium text-slate-200">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-300" />
                {tx("Identity checks before booking")}
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-300" />
                {tx("Fees shown before you request")}
              </span>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="absolute -left-3 top-8 hidden h-[calc(100%-4rem)] w-1 bg-brand-400 lg:block" />
            <div className="ml-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-xl sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{tx("Start your search")}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    {tx("What kind of help do you need?")}
                  </h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Search size={20} />
                </span>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {tx("Service")}
                  </span>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="All">{tx("All Services")}</option>
                    <option value="Childcare">{tx("Childcare & Nanny")}</option>
                    <option value="Cooking">{tx("Cooking & Chef")}</option>
                    <option value="Housekeeping">{tx("Housekeeping & Maid")}</option>
                    <option value="Deep Cleaning">{tx("Deep Cleaning")}</option>
                    <option value="Elderly Care">{tx("Elderly Companion")}</option>
                    <option value="Laundry">{tx("Laundry & Ironing")}</option>
                    <option value="Refrigerator Repair">{tx("Refrigerator Repair")}</option>
                    <option value="Microwave Repair">{tx("Microwave Repair")}</option>
                    <option value="Appliance Repair">{tx("Appliance Repair")}</option>
                    <option value="Mechanical Repairs">{tx("Mechanical Repairs")}</option>
                    <option value="Automotive Repair">{tx("Automotive Repair")}</option>
                    <option value="Plumbing">{tx("Plumbing")}</option>
                    <option value="Electrical Repairs">{tx("Electrical Repairs")}</option>
                    <option value="Carpentry">{tx("Carpentry")}</option>
                    <option value="Painting">{tx("Painting")}</option>
                    <option value="Air Conditioning Repair">{tx("Air Conditioning Repair")}</option>
                    <option value="General Repairs">{tx("General Repairs")}</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {tx("Location")}
                  </span>
                  <span className="flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                    <MapPin size={17} className="shrink-0 text-brand-700" />
                    <input
                      type="text"
                      placeholder={tx("Area, City (e.g. Westlands, Nairobi)")}
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full bg-transparent py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </span>
                </label>

                <button type="submit" className="btn-primary w-full">
                  <Search size={16} />
                  <span>{tx("Find Helper")}</span>
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="mb-3 text-xs font-semibold text-slate-600">
                  {tx("Browse services")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.slice(0, 4).map((category) => (
                    <Link
                      key={category.value}
                      href={`/workers?service=${encodeURIComponent(category.value)}`}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                    >
                      {tx(category.label)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="section grid divide-y divide-slate-200 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: UserCheck,
              title: "Identity verification",
              body: "Required before clients can book.",
            },
            {
              icon: Search,
              title: "Worker profiles",
              body: "Compare services and listed availability.",
            },
            {
              icon: CreditCard,
              title: "Clear booking fees",
              body: "Review the fee before requesting a booking.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-4 py-5 sm:px-6">
              <Icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{tx(title)}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tx(body)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── CATEGORIES ───────────────── */}
      <section className="section pt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <span className="eyebrow">{tx("Browse by need")}</span>
            <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
              {tx("What does your household need?")}
            </h2>
          </div>
          <Link
            href="/workers"
            className="text-sm font-bold text-brand-700 hover:text-brand-800 transition-colors inline-flex items-center gap-1.5"
          >
            <span>{tx("View all categories")}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.slice(0, 6).map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.value}
                href={`/workers?service=${encodeURIComponent(c.value)}`}
                className="group flex min-h-28 items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-white">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <span className="block text-sm font-semibold leading-snug text-slate-900">
                    {tx(c.label)}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                    {tx(c.blurb)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section id="how-it-works" className="section pt-20 scroll-mt-24">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <span className="eyebrow">{tx("A clear process")}</span>
          <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
            {t("nav.howItWorks")}
          </h2>
          <p className="text-slate-600 text-sm">
            {tx("The steps from finding a service to submitting a booking request.")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ n, title, body, icon: Icon }) => {
            return (
              <div
                key={n}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="text-xs font-semibold tracking-widest text-slate-400">{n}</span>
                </div>
                <h3 className="font-semibold text-slate-900">{tx(title)}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{tx(body)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────── FEATURED HELPERS ───────────────── */}
      <section className="section pt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <span className="eyebrow">{tx("Worker directory")}</span>
            <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
              {tx("Worker profiles")}
            </h2>
            <p className="text-slate-600 text-sm">
              {tx("Review worker profiles and availability before requesting a booking.")}
            </p>
          </div>
          <Link
            href="/workers"
            className="text-sm font-bold text-brand-700 hover:text-brand-800 transition-colors inline-flex items-center gap-1.5"
          >
            <span>{tx("View all helpers")}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredWorkersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 space-y-4"
                >
                  <div className="flex gap-3">
                    <div className="skeleton w-14 h-14 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3.5 w-2/3 rounded-full" />
                      <div className="skeleton h-3 w-1/3 rounded-full" />
                    </div>
                  </div>
                  <div className="skeleton h-3 w-full rounded-full" />
                  <div className="skeleton h-3 w-5/6 rounded-full" />
                  <div className="skeleton h-3 w-4/6 rounded-full" />
                </div>
              ))
            : featuredWorkersError
              ? (
                <div className="col-span-full rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  {tx("Worker profiles could not be loaded.")}
                </div>
              )
              : featuredWorkers.length === 0
                ? (
                  <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="font-semibold text-slate-900">{tx("No worker profiles to show yet.")}</h3>
                    <p className="mt-1 text-sm text-slate-600">{tx("Browse services or check back later.")}</p>
                  </div>
                )
                : featuredWorkers.map((wp) => (
                <div
                  key={wp.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={wp.user.avatar}
                          name={wp.user.name}
                          className="w-14 h-14 rounded-2xl border border-slate-200 shadow-sm ring-2 ring-white group-hover:ring-brand-200 transition-all"
                          textClassName="text-lg"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-base truncate">
                            {wp.user.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            <span className="truncate">{wp.location}</span>
                          </p>
                        </div>
                      </div>
                      <VerificationBadge
                        status={wp.user.idVerificationStatus}
                        size="sm"
                      />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
                        {wp.headline}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {wp.bio}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {wp.services.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-md"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      {wp.reviewCount > 0 ? (
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star size={14} fill="currentColor" />
                          <span>{wp.rating.toFixed(1)}</span>
                          <span className="text-slate-400 font-medium">
                            ({wp.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">{tx("No reviews yet")}</span>
                      )}
                      <div className="flex items-center gap-1 text-slate-500 font-semibold">
                        <Award size={13} className="text-brand-600" />
                        <span>{wp.yearsExperience} yrs exp</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.14em] block">
                        {tx("One-time hire fee")}
                      </span>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-black text-slate-900 leading-none">
                          {tx("Daily")}: {formatPrice(DAILY_HIRING_FEE_USD)}
                          {" · "}
                          {tx("Monthly")}: {formatPrice(MONTHLY_HIRING_FEE_USD)}
                        </span>
                        <span className="text-[10px] text-sky-700 font-bold leading-none">
                          {wp.engagementTypes.includes("monthly") && wp.expectedMonthlySalary
                            ? `${formatPrice(wp.expectedMonthlySalary)}/mo available`
                            : `${formatPrice(wp.expectedDailySalary || 8)}/day available`}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/workers/${wp.userId}`}
                      className="btn-secondary btn-sm shrink-0 whitespace-nowrap"
                    >
                      {t("nav.viewProfile")}
                    </Link>
                  </div>
                </div>
              ))
          }
        </div>
      </section>

      {/* ───────────────── FAQ ───────────────── */}
      <section className="section pt-20">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-3">
            <span className="eyebrow">{tx("Questions, answered")}</span>
            <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
              {tx("Everything you need to know")}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              {tx("Review these details before requesting a booking.")}
            </p>
          </div>

          <div className="lg:col-span-8 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    open
                      ? "bg-white border-brand-200 shadow-soft"
                      : "bg-white/70 border-slate-200/90 hover:border-brand-200"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900">{tx(f.q)}</span>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        open
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {open ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-xs text-slate-600 leading-relaxed">
                        {tx(f.a)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────── CLOSING CTA ───────────────── */}
      <section className="section py-20">
        <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {tx("Ready to explore worker profiles?")}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              {tx("Compare services, experience and listed availability before sending a booking request.")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href="/workers" className="btn-primary">
              <Search size={16} />
              <span>{tx("Browse helpers")}</span>
            </Link>
            <Link href="/register" className="btn-secondary">
              <UserCheck size={16} />
              <span>{tx("Create an account")}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
