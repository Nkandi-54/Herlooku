import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicUser, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts
 *
 * Admin-only listing of every account on the platform, grouped by approval
 * state so operators can see who is waiting to be let in. Identity documents
 * and password hashes are never included — `publicUser` strips credentials and
 * the document URLs are only exposed through the verification review endpoint.
 */
export async function GET(req: Request) {
  try {
    requireAdminUser(req);

    const users = db.getUsers();
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
        admins: users.filter((user) => user.role === "admin").length,
      },
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
