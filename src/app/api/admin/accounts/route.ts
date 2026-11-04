import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { isAdminRole, isSuperAdmin, type UserRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Grant administrator access through the database's audited grant_admin RPC,
 * which records the change in admin_audit_log and re-verifies the caller is an
 * administrator. The caller's own session is used, never the service role.
 */
async function grantAdministratorAsCaller(targetId: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("grant_admin", {
    target_user_id: targetId,
  });
  if (error) {
    throw new Error(`GRANT_FAILED: ${error.message}`);
  }
  return (await db.getUserById(targetId)) ?? null;
}

/** Identity documents are never listed in the accounts console. */
function stripPrivateFields(user: ReturnType<typeof publicUser>) {
  if (!user) return user;
  const { idDocumentUrl, idDocumentBackUrl, selfieUrl, idNumber, ...safe } =
    user as Record<string, unknown>;
  void idDocumentUrl;
  void idDocumentBackUrl;
  void selfieUrl;
  void idNumber;
  return safe;
}

/**
 * GET /api/admin/accounts
 *
 * Admin-only. Every account on the platform — clients, workers and
 * administrators — regardless of approval state.
 */
export async function GET(req: Request) {
  try {
    await requireAdminUser(req);

    const users = await db.getAllAccountsAsService();

    return NextResponse.json({
      accounts: users.map(stripPrivateFields),
      totals: {
        all: users.length,
        clients: users.filter((u) => u.role === "client").length,
        workers: users.filter((u) => u.role === "worker").length,
        admins: users.filter((u) => isAdminRole(u.role)).length,
        superAdmins: users.filter((u) => isSuperAdmin(u.role)).length,
        pending: users.filter(
          (u) => (u.accountStatus || "pending") === "pending",
        ).length,
      },
    });
  } catch (error: any) {
    return jsonError(error, "Could not load accounts.");
  }
}

/**
 * PATCH /api/admin/accounts
 *
 * Body: { targetUserId: string; role: "client" | "worker" | "admin" }
 *
 * Promote an account to administrator, or return an administrator to a normal
 * account.
 *
 * Protection of the main administrator:
 *   - The super_admin account can never be changed by anyone, including itself.
 *   - A normal administrator may grant or revoke "admin" only; it cannot touch
 *     the super_admin account. Administrators are peers, so any admin may
 *     demote another admin — the super admin always remains in control.
 */
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json().catch(() => null);
    const { targetUserId, role } = (body ?? {}) as {
      targetUserId?: unknown;
      role?: unknown;
    };

    const allowedRoles: UserRole[] = ["client", "worker", "admin"];
    if (
      typeof targetUserId !== "string" ||
      !targetUserId ||
      typeof role !== "string" ||
      !allowedRoles.includes(role as UserRole)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid parameters. Required: targetUserId and role ('client' | 'worker' | 'admin').",
        },
        { status: 400 },
      );
    }

    if (targetUserId === admin.id) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 },
      );
    }

    const target = await db.getUserById(targetUserId);
    if (!target) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    // The main administrator account is immutable.
    if (isSuperAdmin(target.role)) {
      return NextResponse.json(
        {
          error: "The main administrator account cannot be modified by anyone.",
        },
        { status: 403 },
      );
    }

    const updated =
      role === "admin"
        ? await grantAdministratorAsCaller(target.id)
        : await db.setUserRoleAsService(target.id, role as UserRole);
    if (!updated) {
      return NextResponse.json(
        { error: "Could not update the account role." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      account: stripPrivateFields(publicUser(updated)),
      message:
        role === "admin"
          ? `${updated.name} can now access the administrator console.`
          : `${updated.name} is no longer an administrator.`,
    });
  } catch (error: any) {
    if (typeof error?.message === "string" && error.message.startsWith("GRANT_FAILED")) {
      return NextResponse.json(
        { error: "Administrator access could not be granted." },
        { status: 400 },
      );
    }
    return jsonError(error, "Could not update the account role.");
  }
}

/** Soft-hide an account while preserving financial and identity history. */
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json().catch(() => null);
    const targetUserId =
      typeof body?.targetUserId === "string" ? body.targetUserId : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!targetUserId || reason.length < 3 || reason.length > 1000) {
      return NextResponse.json(
        { error: "Provide an account and a reason between 3 and 1000 characters." },
        { status: 400 },
      );
    }
    if (targetUserId === admin.id) {
      return NextResponse.json(
        { error: "You cannot hide your own administrator account." },
        { status: 400 },
      );
    }

    const target = await db.getUserByIdAsService(targetUserId);
    if (!target || target.deletedAt) {
      return NextResponse.json({ error: "Active account not found." }, { status: 404 });
    }
    if (isSuperAdmin(target.role)) {
      return NextResponse.json(
        { error: "The main administrator account cannot be hidden." },
        { status: 403 },
      );
    }

    await db.softDeleteAccountAsService({
      target,
      actor: admin,
      reason,
      action: "admin_deleted",
    });

    return NextResponse.json({
      success: true,
      message: `${target.name}'s account is hidden. Existing identity, booking, and payment records are retained.`,
    });
  } catch (error: any) {
    if (String(error?.message).includes("active bookings")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return jsonError(error, "Could not hide the account.");
  }
}
