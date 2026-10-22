import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// 5 MB limit — generous for ID scans and profile photos.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/upload
 *
 * multipart/form-data with:
 *   file   — the image
 *   kind   — "avatar" (public bucket) or "identity" (private bucket)
 *
 * Identity documents are stored in the PRIVATE `identity-documents` bucket under
 * a folder named after the owner's uid, so other users can never reach them.
 * The API returns a storage path, not a public URL; the review UI requests a
 * short-lived signed URL when it needs to display them.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);

    const formData = await req.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "avatar");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a JPG, PNG, WEBP or GIF image.",
        },
        { status: 415 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }
    if (bytes.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 413 },
      );
    }

    const bucket = kind === "identity" ? "identity-documents" : "avatars";
    const safeBase = (file.name || "photo")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]/gi, "_")
      .slice(0, 40)
      .toLowerCase();
    // Folder is always the user's uid so storage policies can scope access.
    const path = `${user.id}/${safeBase}-${randomUUID().slice(0, 8)}.${ext}`;

    const supabase = await createServerSupabase();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Upload failed." },
        { status: 500 },
      );
    }

    // Public buckets expose a CDN URL; private ones only return the path.
    if (bucket === "avatars") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return NextResponse.json({
        success: true,
        url: data.publicUrl,
        path,
        message: "Photo uploaded successfully.",
      });
    }

    return NextResponse.json({
      success: true,
      url: path,
      path,
      message: "Document uploaded securely.",
    });
  } catch (error: any) {
    return jsonError(error, "Upload failed.");
  }
}
