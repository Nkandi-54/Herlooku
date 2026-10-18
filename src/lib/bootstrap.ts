import "server-only";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { User } from "@/types";

/**
 * Ensures an administrator exists so the platform is operable on a fresh
 * database. The very first admin is provisioned from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * - On an empty database this creates the admin (password is hashed with scrypt).
 * - If the admin already exists, it does NOT overwrite the password — rotating a
 *   live credential from an env var on every boot would be surprising and unsafe.
 *   Set ADMIN_PASSWORD_RESET=true to deliberately rotate it once.
 *
 * Runs at most once per process; call it from the admin login/bootstrap routes.
 */
let bootstrapPromise: Promise<void> | null = null;

export function ensureAdminBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

async function runBootstrap() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    // No bootstrap credentials configured. If admins already exist we are fine;
    // otherwise the operator must create the first admin deliberately.
    if (db.countAdmins() === 0) {
      console.warn(
        "[bootstrap] No admin account exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set. " +
          "Set them to provision the first administrator.",
      );
    }
    return;
  }

  const existing = db.getUserByEmail(email);
  const reset = process.env.ADMIN_PASSWORD_RESET === "true";

  if (!existing) {
    const admin: User = {
      id: "usr_admin_" + Math.random().toString(36).slice(2, 10),
      name: process.env.ADMIN_NAME || "Platform Administrator",
      email,
      role: "admin",
      avatar: "",
      phone: "",
      location: "Nairobi",
      idVerificationStatus: "verified",
      accountStatus: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      password: hashPassword(password),
    };
    db.createUser(admin);
    console.info(`[bootstrap] Provisioned administrator ${email}.`);
    return;
  }

  // Promote an existing matching user to admin and, if requested, rotate the password.
  const updates: Partial<User> = {
    role: "admin",
    accountStatus: "approved",
    idVerificationStatus: "verified",
  };
  if (reset) {
    updates.password = hashPassword(password);
    console.info(`[bootstrap] Rotated administrator password for ${email}.`);
  }
  db.updateUser(existing.id, updates);
}
