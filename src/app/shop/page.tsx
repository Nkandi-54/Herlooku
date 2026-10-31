"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
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
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Scale,
  Truck,
  Quote,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { KES_PER_USD } from "@/types";

/** Transparent pink Herkolu Island badge — see public/. */
const ISLAND_LOGO = "/herkolu-island-logo.png";

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
  {
    label: "Location",
    value: "Mombasa, Kenya",
    href: "#laundry",
    icon: MapPin,
  },
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
  {
    name: "Pweza (Octopus) Snack Pack",
    detail: "Spiced coastal octopus, freshly prepared.",
    category: "snacks",
  },
  {
    name: "Viazi Karai & Ukwaju",
    detail: "Golden potato fritters with tamarind sauce.",
    category: "snacks",
  },
  {
    name: "Bhajia za Mombasa",
    detail: "Crisp spiced bhajia with chutney.",
    category: "snacks",
  },
  {
    name: "Mkate wa Sinia",
    detail: "Traditional coastal coconut bread.",
    category: "snacks",
  },
  {
    name: "Kaimati (Halwa)",
    detail: "Sweet cardamom dumplings in syrup.",
    category: "snacks",
  },
  {
    name: "Tamarind & Coconut Bites",
    detail: "Coastal sweets by the pack.",
    category: "snacks",
  },
  // Ladies clothes
  {
    name: "Kanga & Kikoi Sets",
    detail: "Authentic coastal wraps in everyday and gift sizes.",
    category: "clothes",
  },
  {
    name: "Kitenge Dresses",
    detail: "Tailored ladies' dresses in classic coastal prints.",
    category: "clothes",
  },
  {
    name: "Abaya & Kaftan",
    detail: "Modest everyday and occasion wear.",
    category: "clothes",
  },
  {
    name: "Shorts, Tops & Blouses",
    detail: "Lightweight, beach-friendly ladies' wear.",
    category: "clothes",
  },
  // Shoes
  {
    name: "Ladies Sandals",
    detail: "Comfortable coastal sandals.",
    category: "shoes",
  },
  { name: "Heels & Wedges", detail: "Occasion footwear.", category: "shoes" },
  {
    name: "Slippers & Beach Shoes",
    detail: "Everyday casual footwear.",
    category: "shoes",
  },
  // Beddings
  {
    name: "Bed Sheets",
    detail: "Single, double and queen sizes.",
    category: "beddings",
  },
  {
    name: "Duvet Covers",
    detail: "Soft, breathable covers for coastal weather.",
    category: "beddings",
  },
  {
    name: "Pillowcases & Pillows",
    detail: "Cotton pillow sets.",
    category: "beddings",
  },
  {
    name: "Mosquito Nets",
    detail: "Treated nets, family and single sizes.",
    category: "beddings",
  },
];

const SECTIONS = [
  {
    key: "snacks",
    label: "Coastal Snacks",
    icon: Coffee,
    blurb: "Fresh local favourites and traditional bites.",
  },
  {
    key: "clothes",
    label: "Ladies Clothes",
    icon: Shirt,
    blurb: "Kanga, kitenge, abaya and everyday wear.",
  },
  {
    key: "shoes",
    label: "Shoes",
    icon: Footprints,
    blurb: "Sandals, heels and beach footwear.",
  },
  {
    key: "beddings",
    label: "Beddings",
    icon: BedDouble,
    blurb: "Sheets, duvets, pillows and nets.",
  },
] as const;

/** Per-category accent so each shelf feels distinct inside the pink family. */
const SECTION_ACCENT: Record<
  Exclude<Category, "all">,
  { ring: string; wash: string; icon: string; glow: string; text: string }
> = {
  snacks: {
    ring: "hover:border-rose-300",
    wash: "from-rose-50 via-white to-white",
    icon: "from-rose-100 to-rose-50 text-rose-600 ring-rose-200",
    glow: "bg-rose-400/20",
    text: "text-rose-600",
  },
  clothes: {
    ring: "hover:border-pink-300",
    wash: "from-pink-50 via-white to-white",
    icon: "from-pink-100 to-pink-50 text-pink-600 ring-pink-200",
    glow: "bg-pink-400/20",
    text: "text-pink-600",
  },
  shoes: {
    ring: "hover:border-fuchsia-300",
    wash: "from-fuchsia-50 via-white to-white",
    icon: "from-fuchsia-100 to-fuchsia-50 text-fuchsia-600 ring-fuchsia-200",
    glow: "bg-fuchsia-400/20",
    text: "text-fuchsia-600",
  },
  beddings: {
    ring: "hover:border-violet-300",
    wash: "from-violet-50 via-white to-white",
    icon: "from-violet-100 to-violet-50 text-violet-600 ring-violet-200",
    glow: "bg-violet-400/20",
    text: "text-violet-600",
  },
};

const SECTION_ICON: Record<Exclude<Category, "all">, typeof Coffee> = {
  snacks: Coffee,
  clothes: Shirt,
  shoes: Footprints,
  beddings: BedDouble,
};

/**
 * Faded Herkolu Island badge used as an ambient watermark behind cards.
 *
 * A few things are deliberate here, because this is easy to get subtly wrong:
 *
 *  - The artwork is line-heavy, so it needs to be reasonably large to read at
 *    all. Shrinking it below ~5rem turns it into an anonymous pink smudge.
 *  - It sits at z-0 with every piece of card content `relative`, so the copy
 *    always paints on top and nothing needs a blend mode.
 *  - The mask feathers only the outer edge: enough to blend the disc into the
 *    card, not enough to erase the palm and the wordmark.
 *  - By default it is centred across the whole card (`inset-0 m-auto`). A
 *    corner placement is fine on tall cards, but on short ones a corner is
 *    usually already occupied by a button or a price, so prefer centred.
 */
const LogoWatermark: React.FC<{
  /** Rendered size, e.g. "w-40 h-40". */
  size?: string;
  /** Positioning classes; defaults to a full-bleed, centred backdrop. */
  corner?: string;
  /** Opacity at rest, as a Tailwind class (e.g. "opacity-[0.12]"). */
  opacity?: string;
  /** Extra classes, e.g. a blur amount. */
  className?: string;
}> = ({
  size = "w-40 h-40",
  corner = "inset-0 m-auto",
  opacity = "opacity-[0.03]",
  className = "",
}) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute z-0 flex items-center justify-center select-none ${corner} ${size} ${opacity} transition-opacity duration-500 ease-out group-hover:opacity-[0.07] ${className}`}
    style={{
      // Fade the disc out before its own edge so no card corner or border can
      // slice a straight line through the artwork.
      WebkitMaskImage:
        "radial-gradient(circle at 50% 50%, black 0%, black 45%, transparent 80%)",
      maskImage:
        "radial-gradient(circle at 50% 50%, black 0%, black 45%, transparent 80%)",
    }}
  >
    <Image
      src={ISLAND_LOGO}
      alt=""
      width={360}
      height={360}
      sizes="360px"
      className="w-full h-full object-contain"
    />
  </span>
);

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
      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 border border-rose-500/25 p-6 sm:p-10 shadow-[0_30px_80px_-40px_rgba(236,72,153,0.55)]">
        {/* Ambient rose glows */}
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-rose-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/4 w-72 h-72 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        {/* Faint island horizon texture */}
        <svg
          aria-hidden
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-24 w-full text-rose-300/[0.07] pointer-events-none"
        >
          <path
            d="M0 80 Q 60 60 120 78 T 240 74 T 360 82 T 400 76 V120 H0 Z"
            fill="currentColor"
          />
          <path
            d="M0 96 Q 70 82 140 94 T 280 92 T 400 96 V120 H0 Z"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl space-y-4 min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 border border-rose-400/35 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-200">
              <Store size={13} />
              Herlooku Island · Mombasa
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Coastal snacks, ladies&apos; clothes, shoes and beddings — plus
              laundry at Ksh {LAUNDRY_RATE_KES} per kg
            </h1>
            <p className="text-sm text-rose-50/75 leading-relaxed">
              Run by the Herlooku web owner in Mombasa. Order anything on this
              page, or bring us your washing — we charge Ksh {LAUNDRY_RATE_KES}{" "}
              for every kilogram, wash, dry and fold included.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={orderHref("Herlooku order enquiry")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-rose-950 shadow-lg shadow-rose-500/30 hover:from-rose-300 hover:to-pink-400 transition-all"
              >
                Place an order
                <ArrowRight size={14} />
              </a>
              <a
                href="#laundry"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200/25 bg-white/[0.06] hover:bg-white/[0.12] px-5 py-3 text-xs font-bold text-white transition-colors"
              >
                <WashingMachine size={14} />
                Laundry pricing
              </a>
            </div>
          </div>

          {/* Pink Herkolu Island logo — seated on a light disc so the
              magenta artwork keeps its contrast against the rose hero. */}
          <div className="relative shrink-0 self-center justify-self-center lg:justify-self-end">
            {/* Outer bloom */}
            <div className="absolute inset-2 rounded-full bg-pink-400/35 blur-[38px] pointer-events-none" />
            <div className="relative rounded-full bg-gradient-to-br from-white via-rose-50 to-rose-200 p-2.5 shadow-[0_24px_60px_-18px_rgba(190,18,60,0.8)] ring-1 ring-white/60">
              <div className="rounded-full bg-rose-50 overflow-hidden">
                <Image
                  src={ISLAND_LOGO}
                  alt="Herkolu Island — coastal store and laundry in Mombasa"
                  width={260}
                  height={260}
                  priority
                  sizes="(min-width: 1024px) 256px, 192px"
                  className="w-44 h-44 sm:w-48 sm:h-48 lg:w-64 lg:h-64 object-contain select-none"
                />
              </div>
              {/* Inner rim light */}
              <div className="pointer-events-none absolute inset-2.5 rounded-full ring-1 ring-rose-300/50" />
            </div>
            <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-950/90 border border-rose-300/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-rose-100 shadow-lg">
              <MapPin size={8} /> Mombasa
            </span>
          </div>
        </div>
      </section>

      {/* ─── Contact strip ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.label}
              href={c.href}
              className="group relative overflow-hidden flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition-all duration-300 hover:border-rose-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(244,63,94,0.45)]"
            >
              <LogoWatermark
                corner="right-4 top-4"
                size="w-24 h-24"
                opacity="opacity-[0.07]"
              />
              <span className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-rose-400/15 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 ring-1 ring-rose-200 text-rose-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Icon size={17} />
              </span>
              <span className="relative min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {c.label}
                </span>
                <span className="block text-sm font-bold text-slate-900 truncate">
                  {c.value}
                </span>
              </span>
            </a>
          );
        })}
      </section>

      {/* ─── Catalogue ──────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
              category === "all"
                ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30"
                : "bg-white border border-slate-200 text-slate-600 shadow-soft hover:text-rose-600 hover:border-rose-300"
            }`}
          >
            Everything
          </button>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = category === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setCategory(s.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30"
                    : "bg-white border border-slate-200 text-slate-600 shadow-soft hover:text-rose-600 hover:border-rose-300"
                }`}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Category tiles */}
        {category === "all" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const accent = SECTION_ACCENT[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setCategory(s.key)}
                  className={`group relative flex flex-col overflow-hidden text-left rounded-2xl border border-slate-200 bg-white p-4 pb-5 shadow-soft transition-all duration-300 ${accent.ring} hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(244,63,94,0.5)]`}
                >
                  <LogoWatermark
                    corner="right-4 top-4"
                    size="w-24 h-24"
                    opacity="opacity-[0.07]"
                  />
                  <span
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.wash} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                  <span
                    className={`pointer-events-none absolute -right-10 -bottom-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${accent.glow}`}
                  />
                  <span className="relative flex items-start justify-between">
                    <span
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ring-1 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${accent.icon}`}
                    >
                      <Icon size={18} />
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-rose-500"
                    />
                  </span>
                  <span className="relative block mt-3 text-sm font-bold text-slate-900">
                    {s.label}
                  </span>
                  <span className="relative block text-[11px] text-slate-500 leading-relaxed mt-1">
                    {s.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = SECTION_ICON[item.category];
            const accent = SECTION_ACCENT[item.category];
            const label =
              SECTIONS.find((s) => s.key === item.category)?.label ?? "";
            return (
              <article
                key={item.name}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-soft transition-all duration-300 ${accent.ring} hover:-translate-y-1 hover:shadow-[0_28px_60px_-32px_rgba(244,63,94,0.5)]`}
              >
                {/* Oversized, blurred brand badge sitting low and right, well
                    away from the title, copy and price row — it reads as a
                    background impression rather than another card element. */}
                <LogoWatermark
                  corner="inset-0 m-auto"
                  size="w-40 h-40"
                  opacity="opacity-[0.04]"
                  className="blur-[1px]"
                />
                <span
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.wash} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <span
                  className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-80 transition-opacity duration-500 ${accent.glow}`}
                />
                {/* Top accent hairline */}
                <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent ${accent.text} to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />

                <div className="relative space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ring-1 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${accent.icon}`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <span className={`block text-[9px] font-black uppercase tracking-[0.14em] ${accent.text}`}>
                        {label}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </div>

                <div className="relative mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span
                    className={
                      item.priceKes
                        ? "text-sm font-black text-slate-900"
                        : "text-[11px] font-semibold text-slate-400"
                    }
                  >
                    {item.priceKes
                      ? formatPrice(item.priceKes / KES_PER_USD)
                      : "Price on request"}
                  </span>
                  <a
                    href={orderHref(`Order: ${item.name}`)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700 hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-colors"
                  >
                    Order
                    <ArrowRight size={11} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ─── Laundry ────────────────────────────────────────────── */}
      <section
        id="laundry"
        className="relative overflow-hidden scroll-mt-24 rounded-[2rem] border border-sky-200 bg-gradient-to-br from-white via-sky-50/60 to-white p-6 sm:p-8 space-y-6 shadow-soft"
      >
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-sky-300/25 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-sky-100 ring-1 ring-sky-200 text-sky-600 flex items-center justify-center">
                <WashingMachine size={18} />
              </span>
              Laundry service · Mombasa
            </h2>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Wash, dry and fold for Ksh {LAUNDRY_RATE_KES} per kilogram.
              Weighing is done in front of you, and the total is confirmed
              before we start.
            </p>
          </div>
          <div className="relative rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 px-5 py-4 shrink-0 overflow-hidden shadow-lg shadow-sky-500/25">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/25 blur-2xl pointer-events-none" />
            <span className="relative text-[10px] font-black uppercase tracking-wider text-sky-100 block">
              Rate
            </span>
            <span className="relative text-2xl font-black text-white">
              Ksh {LAUNDRY_RATE_KES}
            </span>
            <span className="relative text-[11px] text-sky-50/90 block">
              per kilogram
            </span>
          </div>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
          <div className="rounded-2xl border border-sky-200 bg-white p-5 space-y-4 shadow-soft">
            <label
              htmlFor="laundry-kilos"
              className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Scale size={14} className="text-sky-500" />
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
                className="w-20 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-sm font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-xs font-bold text-slate-600">kg</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-gradient-to-r from-sky-50 to-white border border-sky-200 px-4 py-3">
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {safeKilos} kg × Ksh {LAUNDRY_RATE_KES}
              </span>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-lg font-black text-slate-900">
                  Ksh {laundryKes.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  ≈ {formatPrice(laundryKes / KES_PER_USD)}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Final price is confirmed by weight at collection. The minimum
              charge is one kilogram.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Phone,
                title: "Book a pickup",
                body: "Call or WhatsApp the Mombasa line to schedule a collection.",
              },
              {
                icon: Scale,
                title: "We weigh it with you",
                body: `Ksh ${LAUNDRY_RATE_KES} per kilogram is charged on the confirmed weight.`,
              },
              {
                icon: WashingMachine,
                title: "Wash, dry & fold",
                body: "Usually ready within 24–48 hours.",
              },
              {
                icon: Truck,
                title: "Delivered back",
                body: "Returned to your door within Mombasa.",
              },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group relative overflow-hidden flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition-all duration-300 hover:border-sky-300 hover:shadow-[0_18px_40px_-26px_rgba(14,165,233,0.5)]"
                >
                  <LogoWatermark
                    corner="right-4 top-4"
                    size="w-20 h-20"
                opacity="opacity-[0.035]"
                  />
                  <span className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-sky-300/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative w-9 h-9 rounded-xl bg-sky-100 ring-1 ring-sky-200 text-sky-600 flex items-center justify-center shrink-0 font-black text-[11px] transition-transform duration-300 group-hover:scale-105">
                    {i + 1}
                  </span>
                  <div className="relative">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Icon size={12} className="text-sky-500" />
                      {step.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      {step.body}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Trust cards ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            icon: CheckCircle2,
            title: "Local to Mombasa",
            body: "Snacks, clothing, beddings and laundry handled from Mombasa.",
            tint: "text-emerald-600",
            ring: "ring-emerald-200",
            bg: "bg-emerald-50",
            hover: "hover:border-emerald-300",
          },
          {
            icon: Sparkles,
            title: "Confirmed before payment",
            body: "You are told the exact total before anything is paid.",
            tint: "text-rose-600",
            ring: "ring-rose-200",
            bg: "bg-rose-50",
            hover: "hover:border-rose-300",
          },
          {
            icon: Quote,
            title: "Paying the owner directly",
            body: "Store and laundry payments go to the owner of the site.",
            tint: "text-sky-600",
            ring: "ring-sky-200",
            bg: "bg-sky-50",
            hover: "hover:border-sky-300",
          },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.35)] ${c.hover}`}
            >
              <LogoWatermark
                corner="right-4 top-4"
                size="w-20 h-20"
                opacity="opacity-[0.035]"
              />
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span
                className={`relative inline-flex w-10 h-10 rounded-xl items-center justify-center ${c.bg} ring-1 ${c.ring} ${c.tint} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
              >
                <Icon size={18} />
              </span>
              <span className="relative block mt-3 text-sm font-bold text-slate-900">
                {c.title}
              </span>
              <p className="relative text-[11px] text-slate-600 leading-relaxed mt-1">
                {c.body}
              </p>
            </div>
          );
        })}
      </section>

      {/* ─── Cross-sell ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/60 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="absolute -right-10 -bottom-16 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <h2 className="text-base font-black text-white">
            Also looking for a verified househelp?
          </h2>
          <p className="text-xs text-rose-50/70 mt-1">
            Browse ID-verified domestic workers across Kenya.
          </p>
        </div>
        <Link
          href="/workers"
          className="relative inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-rose-700 shadow-lg shadow-rose-950/30 hover:bg-rose-50 transition-colors"
        >
          Browse helpers
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
