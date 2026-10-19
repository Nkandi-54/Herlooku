import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/verification/review
 *
 * Body: { targetUserId: string; decision: "approve" | "reject"; rejectionReason?: string }
 *
 * Admin-only. Approving an ID marks the account ID-verified so it can appear in
 * the directory (provided the account itself is also approved).
 */
export async function POST(req: Request) {
  try {
    await requireAdminUser(req);

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
      message: `User ${updated.name} verification has been ${
        decision === "approve" ? "approved" : "rejected"
      }.`,
    });
  } catch (error: any) {
    return jsonError(error, "Could not review the verification.");
  }
}
