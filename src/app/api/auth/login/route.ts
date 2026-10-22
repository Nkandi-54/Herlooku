import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProfile, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Body: { email: string; password: string }
 *
 * Authenticates against Supabase Auth. Supabase owns password hashing,
 * rate-limiting and the session cookies, so this handler never touches
 * credentials directly.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Provide valid JSON for sign in." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Provide a valid sign-in form." },
        { status: 400 },
      );
    }

    const { email, password } = body as Record<string, unknown>;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      // Deliberately generic: never reveal whether the email exists.
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "Your account profile could not be loaded. Please contact support.",
        },
        { status: 500 },
      );
    }

    if (profile.account_status === "suspended") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "This account has been suspended. Please contact support." },
        { status: 403 },
      );
    }

    // Best-effort login timestamp.
    void supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);

    return NextResponse.json({
      success: true,
      activeUser: publicUser(mapProfile(profile)),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed." },
      { status: 500 },
    );
  }
}
