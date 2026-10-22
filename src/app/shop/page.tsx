"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Store,
  Shirt,
  Footprints,
  BedDouble,
  WashingMachine,
  Coffee,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Scale,
  Truck,
  Quote,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { KES_PER_USD } from "@/types";

const OWNER_PHONE =
  process.env.NEXT_PUBLIC_DEFAULT_MPESA_NUMBER || "+254 740 042 359";

const CONTACTS = [
  {
    label: "Call / WhatsApp",
    value: OWNER_PHONE,
    href: `tel:${OWNER_PHONE.replace(/\s/g, "")}`,
    icon: Phone,
  },
  {
    label: "Email",
    value: "trust@herlooku.com",
    href: "mailto:trust@herlooku.com",
    icon: Mail,
  },
  { label: "Location", value: "Mombasa, Kenya", href: "#laundry", icon: MapPin },
];

/** Ksh 100 per kilogram of laundry. */
const LAUNDRY_RATE_KES = 100;

type Category = "all" | "snacks" | "clothes" | "shoes" | "beddings";

interface ShopItem {
  name: string;
  detail: string;
  priceKes?: number;
  category: Exclude<Category, "all">;
}

const CATALOG: ShopItem[] = [
  // Coastal snacks
  { name: "Pweza (Octopus) Snack Pack", detail: "Spiced coastal octopus, freshly prepared.", category: "snacks" },
  { name: "Viazi Karai & Ukwaju", detail: "Golden potato fritters with tamarind sauce.", category: "snacks" },
  { name: "Bhajia za Mombasa", detail: "Crisp spiced bhajia with chutney.", category: "snacks" },
  { name: "Mkate wa Sinia", detail: "Traditional coastal coconut bread.", category: "snacks" },
  { name: "Kaimati (Halwa)", detail: "Sweet cardamom dumplings in syrup.", category: "snacks" },
  { name: "Tamarind & Coconut Bites", detail: "Coastal sweets by the pack.", category: "snacks" },
  // Ladies clothes
  { name: "Kanga & Kikoi Sets", detail: "Authentic coastal wraps in everyday and gift sizes.", category: "clothes" },
  { name: "Kitenge Dresses", detail: "Tailored ladies' dresses in classic coastal prints.", category: "clothes" },
  { name: "Abaya & Kaftan", detail: "Modest everyday and occasion wear.", category: "clothes" },
  { name: "Shorts, Tops & Blouses", detail: "Lightweight, beach-friendly ladies' wear.", category: "clothes" },
  // Shoes
  { name: "Ladies Sandals", detail: "Comfortable coastal sandals.", category: "shoes" },
  { name: "Heels & Wedges", detail: "Occasion footwear.", category: "shoes" },
  { name: "Slippers & Beach Shoes", detail: "Everyday casual footwear.", category: "shoes" },
  // Beddings
  { name: "Bed Sheets", detail: "Single, double and queen sizes.", category: "beddings" },
  { name: "Duvet Covers", detail: "Soft, breathable covers for coastal weather.", category: "beddings" },
  { name: "Pillowcases & Pillows", detail: "Cotton pillow sets.", category: "beddings" },
  { name: "Mosquito Nets", detail: "Treated nets, family and single sizes.", category: "beddings" },
];

const SECTIONS = [
  { key: "snacks", label: "Coastal Snacks", icon: Coffee, blurb: "Fresh local favourites and traditional bites." },
  { key: "clothes", label: "Ladies Clothes", icon: Shirt, blurb: "Kanga, kitenge, abaya and everyday wear." },
  { key: "shoes", label: "Shoes", icon: Footprints, blurb: "Sandals, heels and beach footwear." },
  { key: "beddings", label: "Beddings", icon: BedDouble, blurb: "Sheets, duvets, pillows and nets." },
] as const;

export default function ShopPage() {
  const { formatPrice } = useCurrency();
  const [category, setCategory] = useState<Category>("all");
  const [kilos, setKilos] = useState<number>(5);

  const items = useMemo(
    () =>
      category === "all"
        ? CATALOG
        : CATALOG.filter((item) => item.category === category),
    [category],
  );

  const safeKilos = Math.max(0, Math.floor(kilos || 0));
  const laundryKes = safeKilos * LAUNDRY_RATE_KES;

  const orderHref = (subject: string) =>
    `mailto:trust@herlooku.com?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/50 border border-slate-800 p-6 sm:p-10">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
            <Store size={13} />
            Herlooku Storefront · Mombasa
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Coastal snacks, ladies&apos; clothes, shoes and beddings — plus
            laundry at Ksh {LAUNDRY_RATE_KES} per kg
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Run by the Herlooku web owner in Mombasa. Order anything on this page,
            or bring us your washing — we charge Ksh {LAUNDRY_RATE_KES} for every
            kilogram, wash, dry and fold included.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={orderHref("Herlooku order enquiry")}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-colors"
            >
              Place an order
              <ArrowRight size={14} />
            </a>
            <a
              href="#laundry"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 px-5 py-3 text-xs font-bold text-white transition-colors"
            >
              <WashingMachine size={14} />
              Laundry pricing
            </a>
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.label}
              href={c.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 hover:border-amber-500/40 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {c.label}
                </span>
                <span className="block text-sm font-bold text-white truncate">{c.value}</span>
              </span>
            </a>
          );
        })}
      </section>

      {/* Catalogue */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              category === "all"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Everything
          </button>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setCategory(s.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  category === s.key
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>

        {category === "all" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setCategory(s.key)}
                  className="text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 hover:border-amber-500/40 transition-colors"
                >
                  <Icon size={18} className="text-amber-300" />
                  <span className="block mt-2 text-sm font-bold text-white">{s.label}</span>
                  <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">
                    {s.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">{item.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {item.priceKes
                    ? formatPrice(item.priceKes / KES_PER_USD)
                    : "Price on request"}
                </span>
                <a
                  href={orderHref(`Order: ${item.name}`)}
                  className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/25 transition-colors"
                >
                  Order
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Laundry */}
      <section
        id="laundry"
        className="scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <WashingMachine size={22} className="text-sky-400" />
              Laundry service · Mombasa
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Wash, dry and fold for Ksh {LAUNDRY_RATE_KES} per kilogram. Weighing is
              done in front of you, and the total is confirmed before we start.
            </p>
          </div>
          <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 px-5 py-4 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 block">
              Rate
            </span>
            <span className="text-2xl font-black text-white">Ksh {LAUNDRY_RATE_KES}</span>
            <span className="text-[11px] text-slate-300 block">per kilogram</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <label
              htmlFor="laundry-kilos"
              className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
            >
              <Scale size={14} className="text-sky-400" />
              Estimate your load
            </label>
            <div className="flex items-center gap-3">
              <input
                id="laundry-kilos"
                type="range"
                min={1}
                max={40}
                value={kilos}
                onChange={(e) => setKilos(Number(e.target.value))}
                className="flex-1 accent-sky-500"
              />
              <input
                type="number"
                min={1}
                max={40}
                value={kilos}
                onChange={(e) => setKilos(Number(e.target.value))}
                aria-label="Kilograms of laundry"
                className="w-20 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-bold text-white text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-xs font-bold text-slate-300">kg</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
              <span className="text-xs text-slate-400">
                {safeKilos} kg × Ksh {LAUNDRY_RATE_KES}
              </span>
              <span className="text-lg font-black text-white">
                Ksh {laundryKes.toLocaleString()}
                <span className="text-[11px] font-semibold text-slate-400 ml-2">
                  ≈ {formatPrice(laundryKes / KES_PER_USD)}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Final price is confirmed by weight at collection. The minimum charge
              is one kilogram.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Phone, title: "Book a pickup", body: "Call or WhatsApp the Mombasa line to schedule a collection." },
              { icon: Scale, title: "We weigh it with you", body: "Ksh 100 per kilogram is charged on the confirmed weight." },
              { icon: WashingMachine, title: "Wash, dry & fold", body: "Usually ready within 24–48 hours." },
              { icon: Truck, title: "Delivered back", body: "Returned to your door within Mombasa." },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-white">{step.title}</span>
                    <span className="block text-[11px] text-slate-400 leading-relaxed">
                      {step.body}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { icon: CheckCircle2, title: "Local to Mombasa", body: "Snacks, clothing, beddings and laundry handled from Mombasa." },
          { icon: Sparkles, title: "Confirmed before payment", body: "You are told the exact total before anything is paid." },
          { icon: Quote, title: "Paying the owner directly", body: "Store and laundry payments go to the owner of the site." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <Icon size={18} className="text-emerald-400" />
              <span className="block mt-2 text-sm font-bold text-white">{c.title}</span>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{c.body}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white">
            Also looking for a verified househelp?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse ID-verified domestic workers across Kenya.
          </p>
        </div>
        <Link
          href="/workers"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition-colors"
        >
          Browse helpers
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
