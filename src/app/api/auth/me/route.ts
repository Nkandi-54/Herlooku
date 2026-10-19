import { NextResponse } from "next/server";
import { getAuthenticatedUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — returns the signed-in user only.
 *
 * There is deliberately no endpoint that impersonates another account or lists
 * every user.
 */
export async function GET(req: Request) {
  const activeUser = await getAuthenticatedUser(req);
  return NextResponse.json({ activeUser: publicUser(activeUser) });
}
