import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProfile, publicUser } from "@/lib/auth";

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
    const body = await req.json();
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
    } = body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !phone?.trim() ||
      !role
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

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Choose a password with at least 8 characters." },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const normalizedPhone = String(phone).replace(/[\s\-()]/g, "");
    if (!/^(\+?254|0)[17]\d{8}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan phone number, e.g. 0712 345 678." },
        { status: 400 },
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: String(password),
      options: {
        // Read by the handle_new_user trigger to populate the profile row.
        data: {
          name: name.trim(),
          role,
          phone: normalizedPhone,
          location: location?.trim() || "Kenya",
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

    // Email confirmation may be enabled in Supabase. In that case there is no
    // session yet and the profile trigger still runs.
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

    // Create the worker profile shell (invisible until approved + verified).
    if (role === "worker") {
      await supabase.from("worker_profiles").upsert(
        {
          user_id: data.user.id,
          headline: headline?.trim() || "Domestic Helper",
          bio: "",
          services:
            Array.isArray(services) && services.length
              ? services
              : ["Housekeeping"],
          expected_daily_salary: Number(expectedDailySalary) || 8,
          expected_monthly_salary: (Number(expectedDailySalary) || 8) * 26,
          engagement_types: ["daily", "monthly"],
          location: location?.trim() || "Kenya",
          languages: ["English", "Swahili"],
          available_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          skills: ["Cleaning", "Housekeeping"],
        },
        { onConflict: "user_id" },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        activeUser: profile ? publicUser(mapProfile(profile)) : null,
        message:
          "Account created. An administrator will review your account; you can complete ID verification while you wait.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Registration failed." },
      { status: 500 },
    );
  }
}
