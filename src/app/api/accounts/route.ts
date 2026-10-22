import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAdminUser } from "@/lib/auth";
import { isAdminRole } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts — admin-only listing of every account, grouped by approval
 * state. Identity documents and credentials are never included.
 */
export async function GET(req: Request) {
  try {
    await requireAdminUser(req);

    const users = await db.getUsers();

    const stripDocs = (user: ReturnType<typeof publicUser>) => {
      if (!user) return user;
      const { idDocumentUrl, idDocumentBackUrl, selfieUrl, idNumber, ...safe } =
        user as any;
      return safe;
    };

    const byStatus = (status: string) =>
      users
        .filter((user) => (user.accountStatus || "pending") === status)
        .map((user) => stripDocs(publicUser(user)));

    return NextResponse.json({
      pending: byStatus("pending"),
      approved: byStatus("approved"),
      rejected: byStatus("rejected"),
      suspended: byStatus("suspended"),
      totals: {
        all: users.length,
        clients: users.filter((user) => user.role === "client").length,
        workers: users.filter((user) => user.role === "worker").length,
        admins: users.filter((user) => isAdminRole(user.role)).length,
        superAdmins: users.filter((user) => user.role === "super_admin").length,
      },
    });
  } catch (error: any) {
    return jsonError(error, "Could not load accounts.");
  }
}
