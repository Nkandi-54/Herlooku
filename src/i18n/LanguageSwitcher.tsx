"use client";

import React from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LOCALE_LABELS, type Locale } from "@/i18n/types";

/**
 * English / Kiswahili toggle.
 *
 * Mirrors the CurrencySelector's segmented-control look so the two switchers
 * read as a matched pair in the header. Deliberately NOT rendered anywhere
 * inside /admin — see AdminLanguageGuard.
 */
export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { locale, setLocale, t } = useLanguage();

  const options: Locale[] = ["en", "sw"];

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={`inline-flex items-center rounded-xl bg-white/5 p-0.5 border border-white/10 text-[11px] font-bold ${className}`}
    >
      {options.map((l) => {
        const isActive = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={isActive}
            title={LOCALE_LABELS[l].native}
            className={`px-2 py-0.5 rounded-lg transition-all ${
              isActive
                ? "bg-brand-600 text-white shadow-sm font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {LOCALE_LABELS[l].short}
          </button>
        );
      })}
    </div>
  );
};
