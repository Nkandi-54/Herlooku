import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/verification/review
 *
 * Body: { targetUserId: string; decision: "approve" | "reject"; rejectionReason?: string }
 *
 * Admin-only. Approving an ID also approves a pending active account, making
 * verified workers visible in the directory immediately.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser(req);

    const body = await req.json();
    const { targetUserId, decision, rejectionReason } = body;

    if (
      !targetUserId ||
      !decision ||
      (decision !== "approve" && decision !== "reject")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid review parameters. Required: targetUserId, decision ('approve' | 'reject').",
        },
        { status: 400 },
      );
    }

    const updated = await db.reviewIdVerification(
      String(targetUserId),
      decision,
      admin.id,
      rejectionReason,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user: publicUser(updated),
      message:
        decision === "approve"
          ? updated.accountStatus === "approved"
            ? `${updated.name}'s identity is verified, account approved, and uploaded identity files deleted.`
            : `${updated.name}'s identity is verified and uploaded identity files deleted. The account remains ${updated.accountStatus || "pending"}.`
          : `${updated.name} verification has been rejected and uploaded identity files deleted.`,
    });
  } catch (error: any) {
    return jsonError(error, "Could not review the verification.");
  }
}
