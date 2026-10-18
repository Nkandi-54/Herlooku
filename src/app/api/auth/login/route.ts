import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clearLoginFailures,
  hashPassword,
  isLoginThrottled,
  publicUser,
  recordLoginFailure,
  setSession,
  verifyPassword,
} from "@/lib/auth";
import { ensureAdminBootstrap } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Body: { email: string; password: string }
 * Authenticates against the scrypt password hash. On success, issues a signed,
 * httpOnly session cookie. Failed attempts are throttled per IP + identifier.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const identifier = String(email).trim().toLowerCase();

    if (isLoginThrottled(req, identifier)) {
      return NextResponse.json(
        {
          error: "Too many failed attempts. Please try again in a few minutes.",
        },
        { status: 429 },
      );
    }

    const user = db.getUserByEmail(identifier);
    if (!user) {
      recordLoginFailure(req, identifier);
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    // The first admin may be provisioned lazily from env credentials.
    if (user.role === "admin") {
      await ensureAdminBootstrap();
    }

    if (!verifyPassword(String(password), user.password)) {
      recordLoginFailure(req, identifier);
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    clearLoginFailures(req, identifier);
    return setSession(
      NextResponse.json({
        success: true,
        activeUser: publicUser(db.getUserById(user.id)),
      }),
      user.id,
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed." },
      { status: 500 },
    );
  }
}
