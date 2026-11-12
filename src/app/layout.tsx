import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AdminLanguageGuard } from "@/i18n/AdminLanguageGuard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VerificationReminder } from "@/components/VerificationReminder";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://herlookutaskninja.vercel.app",
  ),
  title: {
    default: "Herlooku Task Ninja — Verified Househelps, Exclusively Booked",
    template: "%s · Herlooku Task Ninja",
  },
  description:
    "Browse household workers, compare services and availability, and review hiring fees before booking.",
  keywords: [
    "househelp",
    "verified nanny",
    "domestic worker",
    "housekeeping Nairobi",
    "exclusive booking",
    "task ninja",
  ],
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col antialiased bg-slate-50 text-slate-900 font-sans">
        <LanguageProvider>
          <CurrencyProvider>
            <AdminLanguageGuard />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:text-xs focus:font-bold"
            >
              Skip to content
            </a>
            <Navbar />
            <VerificationReminder />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </CurrencyProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
