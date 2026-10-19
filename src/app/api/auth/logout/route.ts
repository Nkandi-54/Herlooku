import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — revokes the Supabase session and clears its cookies. */
export async function POST() {
  try {
    const supabase = createServerSupabase();
    await supabase.auth.signOut();
  } catch {
    /* Signing out is always treated as success. */
  }
  return NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });
}
