import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/accounts/password
 *
 * Body: { currentPassword: string; newPassword: string }
 *
 * Rotates the signed-in user's password through Supabase Auth. Supabase verifies
 * the current password when we re-authenticate, so a hijacked session cannot
 * silently lock the owner out.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 },
      );
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { error: "Choose a password with at least 8 characters." },
        { status: 400 },
      );
    }

    if (String(currentPassword) === String(newPassword)) {
      return NextResponse.json(
        { error: "Your new password must be different from the current one." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();

    // Re-authenticate first: proves the caller knows the current password.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: String(currentPassword),
    });

    if (reauthError) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 401 },
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: String(newPassword),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been updated.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not update your password.");
  }
}
