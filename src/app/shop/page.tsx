"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Building2,
  Home,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Store,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const PHONE_NUMBER = "+254740042359";
const WHATSAPP_URL = `https://wa.me/${PHONE_NUMBER.slice(1)}?text=${encodeURIComponent(
  "Hi Herlooku Task Ninja, I would like to ask about your cleaning services.",
)}`;
const INSTAGRAM_URL = "https://instagram.com/herlooku.taskninja";

export default function CleaningServicesPage() {
  const { t } = useLanguage();
  const tx = (copy: string) => t(`copy:${copy}`);

  const services = [
    { title: tx("Home cleaning"), icon: Home },
    { title: tx("Office cleaning"), icon: Building2 },
    { title: tx("Commercial space cleaning"), icon: Store },
  ];

  return (
    <div className="section space-y-10 py-10 sm:py-14">
      <section className="grid items-center gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl space-y-5">
          <p className="eyebrow">{tx("Professional cleaning services")}</p>
          <h1 className="display-1 text-4xl text-slate-900 sm:text-5xl">
            {tx("For homes, offices and commercial spaces.")}
          </h1>
          <p className="text-base text-slate-600">
            {tx("Clean spaces. Fresh vibes. Every time.")}
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={16} className="text-brand-700" />
            {tx("Mombasa and surrounding areas")}
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <MessageCircle size={16} />
              {tx("Request a cleaning quote")}
              <ArrowUpRight size={15} />
            </a>
            <a href={`tel:${PHONE_NUMBER}`} className="btn-secondary">
              <Phone size={16} />
              {tx("Call")} +254 740 042359
            </a>
          </div>
        </div>

        <Image
          src="/herlooku-brand.png"
          alt="Herlooku Task Ninja — Clean spaces, fresh vibes, every time"
          width={440}
          height={290}
          className="mx-auto h-auto w-56 sm:w-64 lg:w-72"
          priority
        />
      </section>

      <section aria-labelledby="cleaning-services-heading" className="space-y-5">
        <div className="max-w-2xl space-y-2">
          <h2
            id="cleaning-services-heading"
            className="display-1 text-2xl text-slate-900 sm:text-3xl"
          >
            {tx("Cleaning services")}
          </h2>
          <p className="text-sm text-slate-600">
            {tx("Contact us to discuss your space and request a quote.")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {services.map(({ title, icon: Icon }) => (
            <article
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                <Icon size={20} />
              </span>
              <h3 className="font-semibold text-slate-900">{title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {tx("Get in touch with Herlooku")}
          </h2>
          <p className="text-sm text-slate-300">
            {tx("Ask about cleaning services in Mombasa and nearby areas.")}
          </p>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:self-auto"
        >
          <Instagram size={16} />
          @herlooku.taskninja
          <ArrowUpRight size={14} />
        </a>
      </section>
    </div>
  );
}
