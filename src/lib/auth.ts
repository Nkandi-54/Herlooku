import "server-only";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { User } from "@/types";

const COOKIE_NAME = "herlooku_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production.");
  }
  return value || "development-only-secret-change-me";
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Strips server-only fields (the password hash) before returning a user to a client. */
export function publicUser(user: User | undefined | null) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * The reduced shape used in the public directory. Identity documents, phone
 * numbers, email addresses and credentials must never appear here.
 */
export function publicWorkerUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    location: user.location,
    idVerificationStatus: user.idVerificationStatus,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
  };
}

/**
 * Reads the signed session cookie and resolves the matching user. Returns null
 * when there is no valid session — there is deliberately NO fallback to any
 * stored "active user", so an unauthenticated request can never be treated as a
 * logged-in account.
 */
export function getAuthenticatedUser(req: Request): User | null {
  const raw = req.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))?.[1];
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(sign(encoded), signature)) return null;

  try {
    const session = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as {
      sub: string;
      exp: number;
    };
    if (!session.sub || session.exp < Date.now()) return null;
    const user = db.getUserById(session.sub);
    if (!user) return null;
    // A suspended or rejected account loses access immediately, even mid-session.
    if (user.role !== "admin" && user.accountStatus === "suspended")
      return null;
    return user;
  } catch {
    return null;
  }
}

export function requireAuthenticatedUser(req: Request): User {
  const user = getAuthenticatedUser(req);
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Admin-only guard for internal operator endpoints. Throws "FORBIDDEN" when the
 * caller is authenticated but is not an administrator.
 */
export function requireAdminUser(req: Request): User {
  const user = requireAuthenticatedUser(req);
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

/** A client or worker must be approved by an administrator before acting. */
export function requireApprovedUser(req: Request): User {
  const user = requireAuthenticatedUser(req);
  if (user.role !== "admin" && user.accountStatus !== "approved") {
    throw new Error("ACCOUNT_NOT_APPROVED");
  }
  return user;
}

export function setSession(response: NextResponse, userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    }),
  ).toString("base64url");
  response.cookies.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

// ── Password hashing (scrypt) ────────────────────────────────────────────────

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, stored: string | undefined) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, salt, digest] = stored.split("$");
  if (!salt || !digest) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(derived, "hex");
  const right = Buffer.from(digest, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// ── In-memory login throttling ───────────────────────────────────────────────
// Cheap brute-force protection for a single-instance deployment. Replace with a
// shared store (Redis) if you scale horizontally.

const attempts = new Map<string, { count: number; firstAt: number }>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function attemptKey(req: Request, identifier: string) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || "local";
  return `${ip}:${identifier.toLowerCase()}`;
}

export function isLoginThrottled(req: Request, identifier: string): boolean {
  const key = attemptKey(req, identifier);
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(req: Request, identifier: string) {
  const key = attemptKey(req, identifier);
  const record = attempts.get(key);
  if (!record || Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  record.count += 1;
}

export function clearLoginFailures(req: Request, identifier: string) {
  attempts.delete(attemptKey(req, identifier));
}
