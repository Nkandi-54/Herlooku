"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageContext";

/**
 * Pins the admin console to English.
 *
 * Admin is an internal operator surface: it must stay in a single language so
 * that audit trails, verification queues and support runbooks are unambiguous.
 * Rather than relying on developers to remember that, this guard forces the
 * locale back to "en" whenever the route is under /admin.
 *
 * It reverts on navigation away, so a visitor who had chosen Kiswahili gets it
 * back the moment they leave the console.
 */
export const AdminLanguageGuard: React.FC = () => {
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();

  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdminRoute && locale !== "en") {
      setLocale("en");
    }
  }, [isAdminRoute, locale, setLocale]);

  return null;
};
