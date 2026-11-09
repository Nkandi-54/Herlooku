import "server-only";

import { NextResponse } from "next/server";
import { User, isAdminRole } from "@/types";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Profile shape as stored in public.profiles. We map snake_case DB columns to
 * the camelCase `User` type the rest of the application already uses.
 */
type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: "client" | "worker" | "admin" | "super_admin";
  avatar: string | null;
  phone: string | null;
  location: string | null;
  household_size: string | null;
  household_notes: string | null;
  id_verification_status: "unverified" | "pending" | "verified" | "rejected";
  id_type: "national_id" | "passport" | "drivers_license" | null;
  id_number: string | null;
  id_document_url: string | null;
  id_document_back_url: string | null;
  selfie_url: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  account_status: "pending" | "approved" | "suspended" | "rejected";
  account_status_reason: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  last_login_at: string | null;
  created_at: string;
};

/** Map a database row to the application's `User` shape. */
export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar || "",
    phone: row.phone || "",
    location: row.location || "",
    householdSize: row.household_size || undefined,
    householdNotes: row.household_notes || undefined,
    idVerificationStatus: row.id_verification_status,
    idType: row.id_type || undefined,
    idNumber: row.id_number || undefined,
    idDocumentUrl: row.id_document_url || undefined,
    idDocumentBackUrl: row.id_document_back_url || undefined,
    selfieUrl: row.selfie_url || undefined,
    rejectionReason: row.rejection_reason || undefined,
    submittedAt: row.submitted_at || undefined,
    verifiedAt: row.verified_at || undefined,
    accountStatus: row.account_status,
    accountStatusReason: row.account_status_reason || undefined,
    deletedAt: row.deleted_at || undefined,
    deletedBy: row.deleted_by || undefined,
    deletionReason: row.deletion_reason || undefined,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    lastLoginAt: row.last_login_at || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Strips server-only fields before returning a user to a client.
 * (Supabase keeps credentials in auth.users, so there is no password on the
 * profile row; this stays for consistent call sites.)
 */
export function publicUser(user: User | undefined | null) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Directory-safe subset. Identity documents, phone numbers, emails and
 * approval internals must never appear in the public worker listing.
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
 * Resolve the signed-in user from Supabase Auth and their profile row.
 * Returns null when there is no valid session.
 */
export async function getAuthenticatedUser(
  _req?: Request,
): Promise<User | null> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) return null;

    // A suspended account loses access immediately, even mid-session.
    if (
      profile.deleted_at ||
      (!isAdminRole(profile.role) && profile.account_status === "suspended")
    ) {
      return null;
    }

    return mapProfile(profile as ProfileRow);
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(req: Request): Promise<User> {
  const user = await getAuthenticatedUser(req);
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/** Admin-only guard. Throws "FORBIDDEN" for authenticated non-admins. */
export async function requireAdminUser(req: Request): Promise<User> {
  const user = await requireAuthenticatedUser(req);
  if (!isAdminRole(user.role)) throw new Error("FORBIDDEN");
  return user;
}

/** A client or worker must be approved by an administrator before acting. */
export async function requireApprovedUser(req: Request): Promise<User> {
  const user = await requireAuthenticatedUser(req);
  if (!isAdminRole(user.role) && user.accountStatus !== "approved") {
    throw new Error("ACCOUNT_NOT_APPROVED");
  }
  return user;
}

/** Extracts a message from an unknown thrown value. */
function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

/** Maps a thrown guard error to the correct HTTP status code. */
export function errorStatus(error: unknown): number {
  const message = errorMessage(error);
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message === "ACCOUNT_NOT_APPROVED") return 403;
  return 500;
}

/** Consistent JSON error body for all route handlers. */
export function jsonError(error: unknown, fallback = "Something went wrong.") {
  const messages: Record<string, string> = {
    UNAUTHENTICATED: "Sign in required.",
    FORBIDDEN: "Administrator access required.",
    ACCOUNT_NOT_APPROVED: "Your account is awaiting administrator approval.",
  };
  const message = errorMessage(error);
  return NextResponse.json(
    { error: (message && messages[message]) || message || fallback },
    { status: errorStatus(error) },
  );
}
