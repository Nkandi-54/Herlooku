import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend-confirmation
 *
 * Body: { email: string }
 *
 * Re-sends the signup confirmation email for an address that has not been
 * confirmed yet. The response is identical whether or not the account exists,
 * so this cannot be used to enumerate registered addresses.
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

    const origin = new URL(req.url).origin;
    const supabase = await createServerSupabase();

    // Redirect straight to sign-in: the point of a re-send is to get the user
    // in, not to dump them on a dashboard they were already blocked from.
    await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        // The nested `?` must be encoded, otherwise `confirmed=true` is
        // swallowed into `next` and the success banner never shows.
        emailRedirectTo: `${origin}/auth/callback?next=/login%3Fconfirmed%3Dtrue`,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "A fresh confirmation link has been sent. Check your inbox and spam folder, then open the link to activate your account.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not resend the confirmation email right now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
