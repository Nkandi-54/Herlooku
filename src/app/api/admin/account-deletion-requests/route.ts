import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminUser(req);
    const [requests, audit] = await Promise.all([
      db.getAccountDeletionRequestsAsService(),
      db.getAccountDeletionAuditAsService(),
    ]);
    return NextResponse.json({
      requests: requests.map((request) => ({
        ...request,
        user: publicUser(request.user),
      })),
      audit,
    });
  } catch (error: any) {
    return jsonError(error, "Could not load account deletion records.");
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json().catch(() => null);
    const requestId =
      typeof body?.requestId === "string" ? body.requestId : "";
    const decision = body?.decision;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (
      !requestId ||
      (decision !== "approve" && decision !== "reject") ||
      reason.length < 3 ||
      reason.length > 1000
    ) {
      return NextResponse.json(
        { error: "Provide a request, a decision, and a reason between 3 and 1000 characters." },
        { status: 400 },
      );
    }

    await db.resolveAccountDeletionRequestAsService({
      requestId,
      actor: admin,
      decision,
      reason,
    });
    return NextResponse.json({
      success: true,
      message:
        decision === "approve"
          ? "The worker account is hidden and the decision has been recorded."
          : "The request was rejected and the decision has been recorded.",
    });
  } catch (error: any) {
    if (String(error?.message).includes("active bookings")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return jsonError(error, "Could not resolve the deletion request.");
  }
}
