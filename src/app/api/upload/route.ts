import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// 5 MB limit — generous for profile photos while keeping the JSON file DB lean.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

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

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Sanitize original name for readability, but always prefix with a UUID
    const safeBase = (file.name || "photo")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]/gi, "_")
      .slice(0, 40)
      .toLowerCase();
    const fileName = `${safeBase}-${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.writeFileSync(filePath, bytes);

    // Delete older uploads with the same base name to avoid unbounded growth
    try {
      const prefix = `${safeBase}-`;
      fs.readdirSync(UPLOAD_DIR)
        .filter((f) => f.startsWith(prefix) && f !== fileName)
        .forEach((f) => fs.unlinkSync(path.join(UPLOAD_DIR, f)));
    } catch {
      // Non-fatal: keep serving the new upload even if cleanup fails
    }

    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      message: "Photo uploaded successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload failed." },
      { status: 500 },
    );
  }
}
