import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError, requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/signed-url?path=<storage path>
 *
 * Returns a short-lived signed URL for a private identity document. Only an
 * administrator may request one. This is how the review workbench displays
 * ID scans without ever making the bucket public.
 */
export async function GET(req: Request) {
  try {
    const user = await requireAdminUser(req);
    const path = new URL(req.url).searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "A storage path is required." },
        { status: 400 },
      );
    }

    // The path is always "<ownerUid>/<file>". Admins may sign any; this guards
    // against signing unrelated buckets by accident.
    const pathSegments = path.split("/");
    if (
      pathSegments.length !== 2 ||
      pathSegments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      return NextResponse.json(
        { error: "Invalid storage path." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.storage
      .from("identity-documents")
      .createSignedUrl(path, 60 * 10); // 10 minutes

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Could not create a signed URL." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      expiresIn: 600,
      requestedBy: user.id,
    });
  } catch (error: any) {
    return jsonError(error, "Could not create a signed URL.");
  }
}
