import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicUser, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/accounts/review
 *
 * Body: { targetUserId: string; decision: "approve" | "reject" | "suspend"; reason?: string }
 *
 * Admin-only. Controls whether a client/worker account is allowed onto the
 * platform. Approval is what makes a worker visible in the public directory and
 * what allows a client to start bookings and payments.
 */
export async function POST(req: Request) {
  try {
    const admin = requireAdminUser(req);
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

    const target = db.getUserById(String(targetUserId));
    if (!target) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }
    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Administrator accounts cannot be reviewed here." },
        { status: 400 },
      );
    }

    const updated = db.reviewAccount(target.id, decision, admin.id, reason);
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
    const status =
      error.message === "UNAUTHENTICATED"
        ? 401
        : error.message === "FORBIDDEN"
          ? 403
          : 500;
    return NextResponse.json(
      {
        error:
          error.message === "FORBIDDEN"
            ? "Administrator access required."
            : error.message,
      },
      { status },
    );
  }
}
