import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  requireAuthenticatedUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/accounts/password
 *
 * Body: { currentPassword: string; newPassword: string }
 * Lets a signed-in user rotate their own password. Requires the current
 * password so a hijacked session cannot silently lock the owner out.
 */
export async function POST(req: Request) {
  try {
    const user = requireAuthenticatedUser(req);
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

    if (!verifyPassword(String(currentPassword), user.password)) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 401 },
      );
    }

    if (verifyPassword(String(newPassword), user.password)) {
      return NextResponse.json(
        { error: "Your new password must be different from the current one." },
        { status: 400 },
      );
    }

    db.updateUser(user.id, { password: hashPassword(String(newPassword)) });

    return NextResponse.json({
      success: true,
      message: "Your password has been updated.",
    });
  } catch (error: any) {
    const status = error.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json(
      {
        error:
          error.message === "UNAUTHENTICATED"
            ? "Sign in required."
            : error.message,
      },
      { status },
    );
  }
}
