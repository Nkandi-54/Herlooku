import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (user.role !== "worker") {
      return NextResponse.json(
        { error: "Only workers can request account deletion." },
        { status: 403 },
      );
    }
    const requests = await db.getAccountDeletionRequestsForUser(user.id);
    return NextResponse.json({ requests });
  } catch (error: any) {
    return jsonError(error, "Could not load deletion request status.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (user.role !== "worker") {
      return NextResponse.json(
        { error: "Only workers can request account deletion." },
        { status: 403 },
      );
    }
    const body = await req.json().catch(() => null);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 1000) {
      return NextResponse.json(
        { error: "Provide a reason between 3 and 1000 characters." },
        { status: 400 },
      );
    }

    await db.createAccountDeletionRequest(user.id, reason);
    return NextResponse.json(
      { success: true, message: "Your account deletion request was sent to the administrators." },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.message === "ACCOUNT_DELETION_REQUEST_PENDING") {
      return NextResponse.json(
        { error: "You already have a pending account deletion request." },
        { status: 409 },
      );
    }
    return jsonError(error, "Could not submit the deletion request.");
  }
}
