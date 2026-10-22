import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";
import { isAdminRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/accounts/review
 *
 * Body: { targetUserId: string; decision: "approve" | "reject" | "suspend"; reason?: string }
 *
 * Admin-only. Approval is what makes a worker visible in the public directory
 * and what allows a client to start bookings and payments.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json();
    const { targetUserId, decision, reason } = body ?? {};

    if (!targetUserId || !["approve", "reject", "suspend"].includes(decision)) {
      return NextResponse.json(
        {
          error:
            "Invalid parameters. Required: targetUserId, decision ('approve' | 'reject' | 'suspend').",
        },
        { status: 400 },
      );
    }

    const target = await db.getUserById(String(targetUserId));
    if (!target) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }
    // Administrators are managed from the Accounts console, never suspended or
    // rejected through the approval queue.
    if (isAdminRole(target.role)) {
      return NextResponse.json(
        { error: "Administrator accounts cannot be reviewed here." },
        { status: 400 },
      );
    }

    const updated = await db.reviewAccount(
      target.id,
      decision,
      admin.id,
      reason,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user: publicUser(updated),
      message: `${updated.name}'s account has been ${
        decision === "approve"
          ? "approved"
          : decision === "suspend"
            ? "suspended"
            : "rejected"
      }.`,
    });
  } catch (error: any) {
    return jsonError(error, "Could not review the account.");
  }
}
