"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import en, { type Translations } from "./en";
import sw from "./sw";
import type { Locale, LanguageContextType } from "./types";

const DICTIONARIES: Record<Locale, Translations> = { en, sw };

const STORAGE_KEY = "herlooku_language";

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

/** Walk a dotted path ("footer.services.childcare") through the dictionary. */
const resolve = (dict: Translations, path: string): string | undefined => {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : undefined;
};

/** Replace {placeholders} with supplied values. */
const interpolate = (
  template: string,
  vars?: Record<string, string | number>,
) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : match,
  );
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  /* Restore the visitor's choice on mount. */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "sw") {
      setLocaleState(saved);
    } else {
      // First visit: honour the browser's preferred language.
      const browserLangs = [navigator.language, ...(navigator.languages ?? [])];
      if (browserLangs.some((l) => l?.toLowerCase().startsWith("sw"))) {
        setLocaleState("sw");
      }
    }
  }, []);

  /* Keep <html lang> in sync so screen readers use the right phonetics. */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      if (key.startsWith("copy:")) {
        const sourceText = key.slice("copy:".length);
        const translated = (DICTIONARIES[locale].copy as Record<string, string>)[sourceText];
        const value = translated ?? (en.copy as Record<string, string>)[sourceText] ?? sourceText;
        return interpolate(value, vars);
      }
      // Fall back to English, then to the key itself — never render blank.
      const value =
        resolve(DICTIONARIES[locale], key) ?? resolve(en, key) ?? key;
      return interpolate(value, vars);
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
