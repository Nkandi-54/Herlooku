import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import { publicUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    if (activeUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Only administrators can review identity verification submissions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetUserId, decision, rejectionReason } = body;

    if (!targetUserId || !decision || (decision !== "approve" && decision !== "reject")) {
      return NextResponse.json(
        { error: "Invalid review parameters. Required: targetUserId, decision ('approve' | 'reject')." },
        { status: 400 }
      );
    }

    const updated = db.reviewIdVerification(targetUserId, decision, rejectionReason);
    if (!updated) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // If target user is a worker and approved, also mark background checks verified
    if (decision === "approve" && updated.role === "worker") {
      db.updateWorkerProfile(targetUserId, {
        policeClearanceVerified: true,
        backgroundCheckVerified: true,
      });
    }

    return NextResponse.json({
      success: true,
      user: publicUser(updated),
      message: `User ${updated.name} verification has been ${
        decision === "approve" ? "approved" : "rejected"
      }.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

