"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Safe to expose — it only ever holds the public anon
 * / publishable key, and all access is constrained by Row Level Security.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
