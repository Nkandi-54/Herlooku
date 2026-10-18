/**
 * i18n type contract.
 *
 * `TranslationKeys` is derived from the English dictionary, and every other
 * locale is typed as `Translations` — so a missing or misspelled Swahili key
 * is a COMPILE ERROR, never a silently blank string in the UI.
 */

export type Locale = "en" | "sw";

export const LOCALES: Locale[] = ["en", "sw"];

export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> =
  {
    en: { short: "EN", native: "English" },
    sw: { short: "SW", native: "Kiswahili" },
  };

export interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key, with optional {placeholder} interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}
