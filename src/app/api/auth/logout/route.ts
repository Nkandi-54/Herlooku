import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Clears the active session by switching to a default state.
 */
export async function POST() {
  return clearSession(NextResponse.json({ success: true, message: "Logged out successfully." }));
}
