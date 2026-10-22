import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Internal administrator roster and audit feed. Never exposed to public pages. */
export async function GET(req: Request) {
  try {
    await requireAdminUser(req);
    const supabase = await createServerSupabase();
    const [adminsResult, auditResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, role, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: true }),
      supabase
        .from("admin_audit_log")
        .select("id, action, actor_id, target_user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (adminsResult.error || auditResult.error) {
      throw new Error("Could not load administrator records.");
    }

    return NextResponse.json({
      administrators: adminsResult.data ?? [],
      auditEvents: auditResult.data ?? [],
    });
  } catch (error: any) {
    return jsonError(error, "Could not load administrator records.");
  }
}

/**
 * POST /api/admins
 *
 * Grants an existing account administrator access. The database RPC verifies
 * the caller, prevents demotion flows, protects the primary administrator, and
 * records the grant in the internal audit log. There is intentionally no
 * public-facing primary-owner indicator.
 */
export async function POST(req: Request) {
  try {
    await requireAdminUser(req);
    const body = await req.json().catch(() => null);
    const targetUserId = body?.targetUserId;

    if (
      typeof targetUserId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        targetUserId,
      )
    ) {
      return NextResponse.json(
        { error: "Provide a valid account identifier." },
        { status: 400 },
      );
    }

    const target = await db.getUserById(targetUserId);
    if (!target) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json(
        { error: "That account already has administrator access." },
        { status: 409 },
      );
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.rpc("grant_admin", {
      target_user_id: targetUserId,
    });
    if (error) {
      return NextResponse.json(
        { error: "Administrator access could not be granted." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      user: publicUser({ ...target, role: "admin" }),
      message: "Administrator access granted and recorded.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not grant administrator access.");
  }
}
