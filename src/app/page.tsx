"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Star,
  Search,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  Coins,
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
  Quote,
  Plus,
  Minus,
  CreditCard,
  BadgeCheck,
  Clock,
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

const TESTIMONIALS = [
  {
    quote:
      "The upfront exclusive booking changed everything. Our nanny was locked to our household for the full period — no double-booking, no last-minute cancellations.",
    name: "Sarah Jenkins",
    role: "Household Client · Westlands",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "As a worker, knowing both sides are ID-verified and my pay goes directly to me — with zero platform deductions — made this feel genuinely fair.",
    name: "Amina Mwangi",
    role: "Verified Househelp · Nairobi Metro",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "The M-Pesa confirmation gave me total confidence. Once payment was verified, our helper was locked and dispatched without delay.",
    name: "David Miller",
    role: "Household Client · Kilimani",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create & Verify ID",
    body: "Register your account and submit your Government ID. Both clients and workers must be verified before any booking.",
    icon: UserCheck,
  },
  {
    n: "02",
    title: "Select a Verified Helper",
    body: "Explore profiles with ratings, references, skill badges and live calendars showing exactly which dates are free.",
    icon: Search,
  },
  {
    n: "03",
    title: "Pay Herlooku Upfront",
    body: "Daily bookings include the Ksh 1,000 hiring fee and booked wages held by Herlooku until completion. Monthly bookings include the Ksh 3,000 fee; employers pay wages directly.",
    icon: CreditCard,
    highlight: true,
  },
  {
    n: "04",
    title: "Direct Till Verification & Dispatch",
    body: "Approve the M-Pesa prompt for your selected engagement. Once Safaricom confirms it, Herlooku locks the schedule and coordinates arrival.",
    icon: BadgeCheck,
  },
];

const FAQS = [
  {
    q: "Why must both clients and workers verify their ID?",
    a: "Domestic placements happen inside private homes, which demands mutual trust. Verification on both sides prevents impersonation and scams, and gives each party certainty about who is behind the door.",
  },
  {
    q: "What exactly does the upfront hire fee cover?",
    a: "Daily hires have a Ksh 1,000 fee and daily wages collected by Herlooku, which pays the worker after task completion. Monthly hires have a Ksh 3,000 fee, and employers pay monthly wages directly.",
  },
  {
    q: "How does Herlooku Task Ninja prevent double-booking?",
    a: "The moment your booking is confirmed, the helper's calendar is locked. Any overlapping date request from another household is automatically rejected by the platform.",
  },
  {
    q: "Can I contact a helper directly before booking?",
    a: "No. For the safety of both parties, direct phone and email contact stays disabled. Herlooku Task Ninja dispatch coordinates arrival and fulfilment through the platform.",
  },
  {
    q: "What happens if something goes wrong during a placement?",
    a: "Raise a priority incident report from your dashboard. Our Trust & Safety team reviews the case and intervenes between client and worker, and severe cases pause the placement immediately.",
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
  const [selectedService, setSelectedService] = useState("All");
  const [searchLocation, setSearchLocation] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/workers")
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles) setFeaturedWorkers(data.profiles.slice(0, 3));
      })
      .catch(console.error);
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
      {/* ───────────────── HERO ───────────────── */}
      <section className="relative overflow-hidden pt-14 pb-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-brand-50/90 via-sky-50/50 to-transparent"
        />
        <div aria-hidden className="absolute inset-0 grid-lines" />
        <div
          aria-hidden
          className="orb w-[30rem] h-[30rem] bg-brand-300/35 -top-32 -left-32 animate-float-slow"
        />
        <div
          aria-hidden
          className="orb w-96 h-96 bg-cyan-300/30 top-24 -right-24 animate-float-slow"
          style={{ animationDelay: "2.5s" }}
        />

        <div className="relative max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur border border-brand-200 text-brand-800 text-xs font-bold shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
              </span>
              <span>
                {tx("Two-sided ID verification · Guaranteed exclusive bookings")}
              </span>
            </div>

            <h1 className="animate-fade-up delay-75 display-1 text-4xl sm:text-6xl lg:text-[4.25rem] text-slate-900">
              {tx("Hire verified househelps.")}
              <br />
              <span className="text-gradient">{tx("Lock them exclusively.")}</span>
            </h1>

            <p className="animate-fade-up delay-150 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {tx("No double-bookings. No unvetted strangers. Every client and worker passes government ID verification. Daily hires cost Ksh 1,000 plus wages held by Herlooku until task completion; monthly hires cost Ksh 3,000, with wages paid directly by employers.")}
            </p>

            {/* Search card */}
            <div className="animate-fade-up delay-300 pt-2 max-w-3xl mx-auto">
              <form
                onSubmit={handleSearch}
                className="bg-white/85 backdrop-blur-xl p-2.5 rounded-[1.75rem] shadow-card border border-white/70 flex flex-col md:flex-row items-stretch gap-2 focus-within:ring-2 focus-within:ring-brand-500/25 transition-all"
              >
                <div className="flex-1 px-3.5 py-2.5 flex items-center gap-2.5 md:border-r border-slate-100/90">
                  <Search size={18} className="text-brand-600 shrink-0" />
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
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
                </div>

                <div className="flex-1 px-3.5 py-2.5 flex items-center gap-2.5">
                  <MapPin size={18} className="text-brand-600 shrink-0" />
                  <input
                    type="text"
                    placeholder={tx("Area, City (e.g. Westlands, Nairobi)")}
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <button type="submit" className="btn-primary shrink-0 md:px-7">
                  <Search size={16} />
                  <span>{tx("Find Helper")}</span>
                </button>
              </form>
            </div>

            {/* CTAs */}
            <div className="animate-fade-up delay-300 pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="btn-primary">
                <UserCheck size={16} />
                <span>{tx("Get Started — It's Free")}</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/workers" className="btn-secondary">
                <Search size={16} className="text-brand-600" />
                <span>{tx("Browse Verified Helpers")}</span>
              </Link>
            </div>

            {/* Stats */}
            <div className="animate-fade-up delay-300 pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { value: "100%", label: "ID-verified members" },
                { value: "0", label: "Double-bookings ever" },
                { value: "24/7", label: "Trust & safety desk" },
                { value: "1 day", label: "Verification turnaround" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.12em] mt-1">
                    {tx(s.label)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── TRUST PANEL ───────────────── */}
      <section className="section">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink via-ink-soft to-brand-950 p-8 sm:p-12 text-white shadow-card">
          <div
            aria-hidden
            className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 left-1/4 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl"
          />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="pill-dark">
                <ShieldCheck size={13} />
                {tx("Strict trust & safety standard")}
              </span>
              <h2 className="display-1 text-3xl sm:text-4xl">
                {tx("Why we insist on verification — and ban off-platform contact.")}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                {tx("Domestic work happens inside private homes. Mutual, verified identity is the only honest foundation for that relationship. Everyone is checked before anyone is booked.")}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {[
                  {
                    icon: UserCheck,
                    title: "Verified househelps",
                    body: "Government ID, background history and references reviewed by our compliance team before listing.",
                    tone: "text-emerald-400",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Verified clients",
                    body: "Households must verify identity before they can lock a worker's calendar exclusively.",
                    tone: "text-brand-300",
                  },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.title}
                      className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-5 hover:bg-white/[0.1] transition-colors"
                    >
                      <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                        <Icon size={17} className={c.tone} />
                        {tx(c.title)}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {tx(c.body)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-1">
                <Link href="/verify-id" className="btn-primary inline-flex">
                  <span>{tx("Check your verification status")}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Guarantee card */}
            <div className="lg:col-span-5">
              <div className="rounded-[1.75rem] bg-white/[0.05] border border-white/12 backdrop-blur-xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <Lock size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-black block">
                      {tx("Direct Till Verification")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {tx("Safaricom-confirmed before dispatch")}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    "Calendar locked exclusively to your household",
                    "No salary handling — paid directly to your helper",
                    "Incident response desk available 24/7",
                    "One-time fee, no recurring commission",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <CheckCircle2
                        size={15}
                        className="text-emerald-400 shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{tx(item)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {tx("One-time hire fee")}
                    </span>
                    <span className="text-2xl font-black">
                      {tx("Daily")}: {formatPrice(DAILY_HIRING_FEE_USD)}
                      {" · "}
                      {tx("Monthly")}: {formatPrice(MONTHLY_HIRING_FEE_USD)}
                    </span>
                  </div>
                  <Clock size={28} className="text-brand-400/50" />
                </div>
              </div>
            </div>
          </div>
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

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.value}
                href={`/workers?service=${encodeURIComponent(c.value)}`}
                className="group relative rounded-2xl bg-white border border-slate-200/90 p-5 flex flex-col items-center text-center gap-3 shadow-soft hover:shadow-card hover:-translate-y-1 hover:border-brand-200 transition-all duration-300 min-h-[10.5rem] justify-start"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1 flex flex-col justify-start">
                  <span className="text-[11px] font-black text-slate-800 block leading-snug">
                    {tx(c.label)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1 leading-snug">
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
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="eyebrow">{tx("Simple 4-step process")}</span>
          <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
            {tx("How exclusive bookings work")}
          </h2>
          <p className="text-slate-600 text-sm">
            {tx("Structured around mutual safety, transparency and guaranteed availability.")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* connector */}
          <div
            aria-hidden
            className="hidden md:block absolute top-[3.25rem] left-[12%] right-[12%] h-px bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200"
          />
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className={`relative rounded-3xl p-6 space-y-3.5 transition-all duration-300 hover:-translate-y-1 border shadow-soft ${
                  s.highlight
                    ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white border-brand-500/40 shadow-glow-brand"
                    : "bg-white border-slate-200/90 hover:shadow-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ${
                      s.highlight
                        ? "bg-white/15 text-white border border-white/25"
                        : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    className={`text-2xl font-black tracking-tight ${
                      s.highlight ? "text-white/25" : "text-slate-200"
                    }`}
                  >
                    {s.n}
                  </span>
                </div>
                <h3
                  className={`font-black text-base ${
                    s.highlight ? "text-white" : "text-slate-900"
                  }`}
                >
                  {tx(s.title)}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    s.highlight ? "text-brand-50/90" : "text-slate-600"
                  }`}
                >
                  {tx(s.body)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────── FEATURED HELPERS ───────────────── */}
      <section className="section pt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <span className="eyebrow">{tx("Verified marketplace")}</span>
            <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
              {tx("Top-rated verified househelps")}
            </h2>
            <p className="text-slate-600 text-sm">
              Government ID verified, background-checked and ready for exclusive
              booking.
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
          {featuredWorkers.length === 0
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
            : featuredWorkers.map((wp) => (
                <div
                  key={wp.id}
                  className="ring-conic group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 flex flex-col justify-between"
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
                      <div className="flex items-center gap-1 text-amber-500 font-black">
                        <Star size={14} fill="currentColor" />
                        <span>{wp.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-medium">
                          ({wp.reviewCount})
                        </span>
                      </div>
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
                      className="btn-primary btn-sm shrink-0 whitespace-nowrap"
                    >
                      {tx("Book exclusively")}
                    </Link>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* ───────────────── TESTIMONIALS ───────────────── */}
      <section className="section pt-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="eyebrow">{tx("Trusted on both sides")}</span>
          <h2 className="display-1 text-3xl sm:text-4xl text-slate-900">
            {tx("Households and helpers agree")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="relative rounded-3xl bg-white border border-slate-200/90 p-6 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-5"
            >
              <Quote size={28} className="text-brand-100" />
              <blockquote className="text-xs text-slate-700 leading-relaxed -mt-6">
                &ldquo;{tx(t.quote)}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{tx(t.role)}</span>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      className="text-amber-400"
                      fill="currentColor"
                    />
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
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
              Still unsure about something? Our trust &amp; safety desk answers
              every enquiry personally.
            </p>
            <Link href="/verify-id" className="btn-secondary inline-flex mt-2">
              <span>{tx("Talk to trust & safety")}</span>
              <ArrowRight size={15} />
            </Link>
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
                    <span className="text-sm font-bold text-slate-900">
                      {f.q}
                    </span>
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
                        {f.a}
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
      <section className="section pt-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-8 py-14 sm:px-14 text-white text-center shadow-card">
          <div
            aria-hidden
            className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-28 -right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl"
          />

          <div className="relative max-w-2xl mx-auto space-y-5">
            <span className="pill-dark mx-auto">
              <Coins size={13} />
              {tx("One-time fee · Zero commission")}
            </span>
            <h2 className="display-1 text-3xl sm:text-4xl">
              {tx("Ready to lock in your verified helper?")}
            </h2>
            <p className="text-brand-50/90 text-sm leading-relaxed">
              {tx("Browse verified househelps, pay the one-time exclusive hire fee, and rest easy — the calendar is yours alone.")}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/workers"
                className="btn bg-white text-brand-700 hover:bg-brand-50 shadow-lg btn px-6 py-3.5"
              >
                <Search size={16} />
                <span>{tx("Browse helpers")}</span>
              </Link>
              <Link
                href="/verify-id"
                className="btn bg-white/10 border border-white/25 text-white hover:bg-white/20 px-6 py-3.5"
              >
                <ShieldCheck size={16} />
                <span>{tx("Get verified first")}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
