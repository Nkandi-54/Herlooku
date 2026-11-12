import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (body?.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Type DELETE to confirm permanent account deletion." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const user = await db.getUserByIdAsService(authUser.id);
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (user.role !== "client" && user.role !== "worker") {
      return NextResponse.json(
        { error: "Only client and worker accounts can be deleted here." },
        { status: 403 },
      );
    }

    await db.permanentlyDeleteAccountAsService({
      targetUserId: user.id,
      reason: "Self-service permanent account deletion",
    });
    await db.deleteAccountStorageAsService(user.id);
    await db.deleteAuthUserAsService(user.id);

    return NextResponse.json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (error: any) {
    if (error?.message === "ACCOUNT_DELETION_HAS_ONGOING_TASKS") {
      return NextResponse.json(
        { error: "Complete or cancel all ongoing tasks before deleting your account." },
        { status: 409 },
      );
    }
    if (error?.message === "ACCOUNT_DELETION_HAS_UNPAID_BILLS") {
      return NextResponse.json(
        { error: "Resolve all pending or unpaid bills before deleting your account." },
        { status: 409 },
      );
    }
    return jsonError(error, "Could not permanently delete your account.");
  }
}
