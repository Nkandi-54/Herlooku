import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProfile, publicUser } from "@/lib/auth";
import { KES_PER_USD } from "@/types";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 *
 * Body: {
 *   name, email, password, phone, role: "client" | "worker",
 *   location?, headline?, services?, expectedDailySalary?
 * }
 *
 * Creates the Supabase Auth user. A database trigger (handle_new_user) creates
 * the matching public.profiles row with account_status = 'pending', so the new
 * account is invisible to the rest of the platform until an administrator
 * approves it.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Provide valid JSON for registration." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Provide a valid registration form." },
        { status: 400 },
      );
    }

    const {
      name,
      email,
      password,
      phone,
      role,
      location,
      headline,
      services,
      expectedDailySalary,
    } = body as Record<string, unknown>;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof role !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, email, password, phone and role are all required." },
        { status: 400 },
      );
    }

    // Users may only self-register as client or worker — never admin.
    if (!["client", "worker"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be either 'client' or 'worker'." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Choose a password with at least 8 characters." },
        { status: 400 },
      );
    }
    if (password.length > 128 || name.trim().length > 120) {
      return NextResponse.json(
        { error: "The name or password exceeds the allowed length." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, "");
    if (!/^(\+?254|0)[17]\d{8}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan phone number, e.g. 0712 345 678." },
        { status: 400 },
      );
    }

    const normalizedLocation =
      typeof location === "string" && location.trim()
        ? location.trim().slice(0, 120)
        : "Kenya";
    const normalizedHeadline =
      typeof headline === "string" && headline.trim()
        ? headline.trim().slice(0, 120)
        : "Domestic Helper";
    const submittedDailySalary =
      expectedDailySalary === undefined ||
      expectedDailySalary === null ||
      expectedDailySalary === ""
        ? null
        : Number(expectedDailySalary);
    if (
      submittedDailySalary !== null &&
      (!Number.isFinite(submittedDailySalary) ||
        submittedDailySalary <= 0 ||
        submittedDailySalary > 1000000)
    ) {
      return NextResponse.json(
        { error: "Enter a valid expected daily pay amount in Ksh." },
        { status: 400 },
      );
    }
    const dailySalary =
      submittedDailySalary === null
        ? 8
        : Number((submittedDailySalary / KES_PER_USD).toFixed(2));

    const supabase = await createServerSupabase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: String(password),
      options: {
        // This must be an allow-listed URL in Supabase Auth. In production it
        // resolves to the canonical Vercel domain, never a localhost address.
        emailRedirectTo: `${getSiteUrl(req)}/auth/callback`,
        // Read by the handle_new_user trigger to populate the profile row.
        data: {
          name: name.trim(),
          role,
          phone: normalizedPhone,
          location: normalizedLocation,
          headline: role === "worker" ? normalizedHeadline : null,
          expectedDailySalary: role === "worker" ? dailySalary : null,
        },
      },
    });

    if (error) {
      const message = /already registered|already exists/i.test(error.message)
        ? "An account with this email address already exists. Please log in."
        : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 },
      );
    }

    // Email confirmation may be enabled. The database trigger creates the
    // worker profile even when Supabase does not issue a session yet.
    if (!data.session) {
      return NextResponse.json(
        {
          success: true,
          requiresEmailConfirmation: true,
          message:
            "Check your inbox to confirm your email address. An administrator will review your account after that.",
        },
        { status: 201 },
      );
    }

    // The signup trigger creates the profile shell. Update it with the
    // additional details collected by this form.
    if (role === "worker") {
      const { data: workerProfile, error: workerProfileError } = await supabase
        .from("worker_profiles")
        .update(
          {
            headline: normalizedHeadline,
            bio: "",
            services:
              Array.isArray(services) && services.length
                ? services.filter(
                    (service): service is string =>
                      typeof service === "string",
                  )
                : ["Housekeeping"],
            expected_daily_salary: dailySalary,
            expected_monthly_salary: dailySalary * 26,
            engagement_types: ["daily", "monthly"],
            location: normalizedLocation,
            languages: ["English", "Swahili"],
            available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            skills: ["Cleaning", "Housekeeping"],
          },
        )
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();

      if (workerProfileError || !workerProfile) {
        console.error("Worker profile setup failed after registration.", workerProfileError);
        return NextResponse.json(
          {
            error:
              "Your account was created, but worker profile setup could not be completed. Please sign in and contact support.",
          },
          { status: 500 },
        );
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup failed after registration.", profileError);
      return NextResponse.json(
        {
          error:
            "Your account was created, but its profile could not be loaded. Please sign in and contact support.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        activeUser: publicUser(mapProfile(profile)),
        message:
          "Account created. An administrator will review your account; you can complete ID verification while you wait.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Registration request failed.", err);
    return NextResponse.json(
      { error: err.message || "Registration failed." },
      { status: 500 },
    );
  }
}
