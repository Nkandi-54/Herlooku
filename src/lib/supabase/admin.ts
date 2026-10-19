import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Use ONLY for operations that must run without a user session:
 *   - the Safaricom M-Pesa callback (locks a worker after payment)
 *   - administrative account approval performed by trusted server code
 *
 * NEVER import this into a Client Component and never return its results
 * unfiltered to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
