"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Star,
  MapPin,
  ShieldCheck,
  Award,
  CheckCircle,
  SlidersHorizontal,
  Home,
  Clock,
  Sparkles,
  Coins,
  ArrowUpDown,
  X,
} from "lucide-react";
import { WorkerProfile, User, CONSTANT_HIRING_FEE_USD } from "@/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Avatar } from "@/components/Avatar";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

function WorkersDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatPrice, currency } = useCurrency();
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);

  const urlService = searchParams.get("service") || "All";
  const urlSearch = searchParams.get("search") || "";

  const [profiles, setProfiles] = useState<(WorkerProfile & { user: User })[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(urlSearch);
  const [selectedService, setSelectedService] = useState(urlService);
  const [maxDailyPay, setMaxDailyPay] = useState<number>(25); // in USD
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyLiveIn, setOnlyLiveIn] = useState(false);
  const [sortBy, setSortBy] = useState<string>("recommended");

  // Keep state synced if URL changes (e.g. from footer link or hero category click)
  useEffect(() => {
    if (urlService && urlService !== selectedService) {
      setSelectedService(urlService);
    }
    if (urlSearch && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [urlService, urlSearch]);

  const services = [
    "All",
    "Childcare",
    "Cooking",
    "Housekeeping",
    "Deep Cleaning",
    "Elderly Care",
    "Laundry",
    "Organization",
    "Yard Care",
  ];
  const serviceLabel = (service: string) =>
    ({
      All: tx("All Services"),
      Childcare: tx("Childcare & Nanny"),
      Cooking: tx("Cooking & Chef"),
      Housekeeping: tx("Housekeeping & Maid"),
      "Deep Cleaning": tx("Deep Cleaning"),
      "Elderly Care": tx("Elderly Companion"),
      Laundry: tx("Laundry & Ironing"),
      Organization: tx("Organization"),
      "Yard Care": tx("Yard & Maintenance"),
    })[service] || service;

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedService !== "All") params.set("service", selectedService);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/workers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let filtered: (WorkerProfile & { user: User })[] = data.profiles || [];
        if (minRating > 0) {
          filtered = filtered.filter((p) => p.rating >= minRating);
        }
        if (onlyLiveIn) {
          filtered = filtered.filter((p) => p.liveInAvailable);
        }
        if (maxDailyPay > 0 && maxDailyPay < 25) {
          filtered = filtered.filter((p) => (p.expectedDailySalary || 8) <= maxDailyPay);
        }

        // Apply sorting
        if (sortBy === "rating_desc") {
          filtered.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === "salary_asc") {
          filtered.sort((a, b) => (a.expectedDailySalary || 8) - (b.expectedDailySalary || 8));
        } else if (sortBy === "salary_desc") {
          filtered.sort((a, b) => (b.expectedDailySalary || 8) - (a.expectedDailySalary || 8));
        } else if (sortBy === "experience_desc") {
          filtered.sort((a, b) => b.yearsExperience - a.yearsExperience);
        } else {
          // Default recommended: high rating with most reviews
          filtered.sort((a, b) => b.rating * (b.reviewCount || 1) - a.rating * (a.reviewCount || 1));
        }

        setProfiles(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [selectedService, search, maxDailyPay, minRating, onlyLiveIn, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfiles();
  };

  const handleResetFilters = () => {
    setSelectedService("All");
    setMaxDailyPay(25);
    setMinRating(0);
    setSearch("");
    setOnlyLiveIn(false);
    setSortBy("recommended");
    router.replace("/workers");
  };

  const hasActiveFilters =
    selectedService !== "All" ||
    search.trim() !== "" ||
    minRating > 0 ||
    maxDailyPay < 25 ||
    onlyLiveIn;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ink via-ink-soft to-brand-950 rounded-[2rem] p-8 sm:p-10 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 animate-rise-in">
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-brand-500/25 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-28 right-1/3 w-64 h-64 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />
        <div className="relative space-y-3.5 max-w-2xl">
          <div className="pill-dark">
            <ShieldCheck size={13} />
            <span>{tx("Verified Domestic Staff Directory")}</span>
          </div>
          <h1 className="display-1 text-3xl sm:text-5xl">
            {tx("Find your exclusive")}{" "}
            <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-brand-200 bg-clip-text text-transparent">
              {tx("househelp")}
            </span>
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            {tx("Every worker has submitted government ID and cleared background checks. Pay the one-time exclusive hire fee upfront to lock your helper’s dates.")}
          </p>
        </div>

        <div className="relative rounded-3xl bg-white/[0.07] backdrop-blur-xl p-5 border border-white/12 text-xs space-y-3 shrink-0 min-w-[15rem]">
          {[
            { label: "100% ID Verified", tone: "text-emerald-300" },
            { label: "Zero Double-Booking", tone: "text-brand-200" },
            { label: "One-Time Exclusive Fee", tone: "text-cyan-200" },
          ].map((r) => (
            <div key={r.label} className={`flex items-center gap-2.5 font-bold ${r.tone}`}>
              <CheckCircle size={16} />
              <span>{tx(r.label)}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {tx("Hire fee")}
            </span>
            <span className="text-lg font-black text-white">
              {formatPrice(CONSTANT_HIRING_FEE_USD)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-brand-600" />
                <span>{tx("Filters")}</span>
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-brand-600 hover:text-brand-800 font-bold transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  <span>{tx("Reset")}</span>
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{tx("Search")}</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={tx("Name, area, skill...")}
                  aria-label={tx("Search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="field pl-9 pr-8"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      fetchProfiles();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </form>

            {/* Service Categories */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                {tx("Service Specialty")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {services.map((svc) => (
                  <button
                    key={svc}
                    onClick={() => setSelectedService(svc)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all duration-200 ${
                      selectedService.toLowerCase() === svc.toLowerCase()
                        ? "bg-brand-600 text-white shadow-glow-brand scale-[1.03]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:-translate-y-0.5"
                    }`}
                  >
                    {serviceLabel(svc)}
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Daily Pay Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>{tx("Max Expected Daily Pay")}</span>
                <span className="text-sky-800 font-bold">
                  {maxDailyPay >= 25 ? tx("Any") : `${formatPrice(maxDailyPay)}/day`}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={maxDailyPay}
                onChange={(e) => setMaxDailyPay(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{formatPrice(5)}/day</span>
                <span>{formatPrice(25)}+ /day</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {t("copy:Hiring fee is constant {fee} for all helpers", { fee: formatPrice(CONSTANT_HIRING_FEE_USD) })}
              </p>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                {tx("Minimum Rating")}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 4.5, 4.8].map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setMinRating(rt)}
                    className={`text-xs py-2 rounded-xl font-bold border text-center transition-all duration-200 ${
                      minRating === rt
                        ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:-translate-y-0.5"
                    }`}
                  >
                    {rt === 0 ? tx("Any") : `${rt} ★+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Live-in Option */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyLiveIn}
                  onChange={(e) => setOnlyLiveIn(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>{tx("Live-in Available Only")}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Directory Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Filter Pills Bar & Sorting Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500">
                {t("copy:Showing {count} verified helpers", { count: profiles.length })}
              </span>
              {selectedService !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-bold text-[11px]">
                  <span>{serviceLabel(selectedService)}</span>
                  <button onClick={() => setSelectedService("All")} className="hover:text-brand-900">
                    <X size={11} />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px]">
                  <span>&ldquo;{search}&rdquo;</span>
                  <button onClick={() => setSearch("")} className="hover:text-sky-900">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown size={13} className="text-slate-400" />
              <label htmlFor="sort-select" className="text-slate-500 font-medium">{tx("Sort:")}</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
              >
                <option value="recommended">{tx("Recommended & Trust")}</option>
                <option value="rating_desc">{tx("Highest Rating")}</option>
                <option value="salary_asc">{tx("Daily Pay: Low to High")}</option>
                <option value="salary_desc">{tx("Daily Pay: High to Low")}</option>
                <option value="experience_desc">{tx("Most Experience")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="card p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="skeleton w-14 h-14 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3.5 w-2/3 rounded-full" />
                      <div className="skeleton h-3 w-1/3 rounded-full" />
                    </div>
                  </div>
                  <div className="skeleton h-3 w-full rounded-full" />
                  <div className="skeleton h-3 w-5/6 rounded-full" />
                  <div className="skeleton h-8 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="card p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <Search size={28} />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {tx("No helpers matched your filters")}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {tx("Try expanding your price range, clearing your search query, or selecting “All” service specialties.")}
              </p>
              <button
                onClick={handleResetFilters}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <X size={13} />
                <span>{tx("Clear all filters")}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profiles.map((wp) => (
                <div
                  key={wp.id}
                  className="ring-conic group relative bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between animate-rise-in"
                >
                  <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-6 space-y-4">
                    {/* Top row: Avatar & Verification */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={wp.user.avatar}
                          name={wp.user.name}
                          className="w-14 h-14 rounded-2xl border border-slate-200 shadow-sm ring-2 ring-transparent group-hover:ring-brand-300 group-hover:scale-105 transition-all duration-300"
                          textClassName="text-lg"
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            {wp.user.name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={13} className="text-slate-400" />
                            <span>{wp.location}</span>
                          </div>
                        </div>
                      </div>
                      <VerificationBadge status={wp.user.idVerificationStatus} size="sm" />
                    </div>

                    {/* Headline and Bio */}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
                        {wp.headline}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {wp.bio}
                      </p>
                    </div>

                    {/* Services Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {wp.services.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedService(s)}
                          className="text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-md hover:bg-brand-100 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Engagement types */}
                    <div className="flex flex-wrap gap-1.5">
                      {(wp.engagementTypes || []).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-100 px-2 py-0.5 rounded-md capitalize"
                        >
                          {t === "daily" ? tx("Daily (1–2 day jobs)") : tx("Monthly")}
                        </span>
                      ))}
                    </div>

                    {/* Experience & Trust Badges */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star size={15} fill="currentColor" />
                        <span>{wp.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({wp.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Award size={14} className="text-brand-600" />
                        <span>{wp.yearsExperience} {tx("yrs exp")}</span>
                      </div>
                      {wp.liveInAvailable && (
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                          {tx("Live-In")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom CTA with Constant Hiring Fee & Daily Pay */}
                  <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        {tx("Hiring Fee")}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(CONSTANT_HIRING_FEE_USD)}
                        </span>
                        <span className="text-[10px] text-slate-500">{tx("one-time")}</span>
                      </div>
                      <span className="text-[10px] text-sky-800 font-bold block mt-0.5">
                        {(wp.engagementTypes || []).includes("daily")
                          ? t("copy:{pay}/day expected", { pay: formatPrice(wp.expectedDailySalary || 8) })
                          : ""}
                        {(wp.engagementTypes || []).includes("monthly")
                          ? `${(wp.engagementTypes || []).includes("daily") ? " · " : ""}${t("copy:{pay}/mo expected", { pay: formatPrice(wp.expectedMonthlySalary || Math.round((wp.expectedDailySalary || 8) * 26)) })}`
                          : ""}
                      </span>
                    </div>

                    <Link
                      href={`/workers/${wp.userId}`}
                      className="btn-primary btn-sm shrink-0 group-hover:shadow-lift"
                    >
                      {tx("Book exclusively")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkersDirectoryPage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">{t("copy:Loading worker directory...")}</p>
        </div>
      }
    >
      <WorkersDirectoryContent />
    </Suspense>
  );
}
