import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email: string }
 *
 * Sends a Supabase password-recovery email. The link lands on
 * /auth/callback?code=… which exchanges it for a session and forwards the user
 * to /reset-password to choose a new password.
 *
 * The response is deliberately identical whether or not the address exists, so
 * this endpoint cannot be used to discover which emails have accounts.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Provide valid JSON." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Provide a valid form." },
        { status: 400 },
      );
    }

    const { email } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();

    // Intentionally ignore the result: a "user not found" response must not
    // change the reply, and Supabase rate-limits resends itself.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${new URL(req.url).origin}/auth/callback?next=/reset-password`,
    });

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not send the reset email right now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
