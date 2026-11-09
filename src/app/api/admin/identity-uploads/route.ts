import { NextResponse } from "next/server";
import { jsonError, requireAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminUser(req);
    const uploads = await db.getIdentityUploadsAsService();
    const supabase = createAdminClient();
    const results = await Promise.all(
      uploads.map(async (upload) => {
        const { data, error } = await supabase.storage
          .from("identity-documents")
          .createSignedUrl(upload.storage_path, 10 * 60);
        if (error || !data) {
          throw new Error(
            `Could not create secure preview for an uploaded identity document: ${error?.message || "unknown storage error"}`,
          );
        }
        return {
          id: upload.id,
          userId: upload.user_id,
          name: upload.profile.name,
          email: upload.profile.email,
          role: upload.profile.role,
          verificationStatus: upload.profile.id_verification_status,
          accountStatus: upload.profile.account_status,
          kind: upload.document_kind,
          uploadedAt: upload.uploaded_at,
          url: data.signedUrl,
          storagePath: upload.storage_path,
        };
      }),
    );

    const knownPaths = new Set(results.map((upload) => upload.storagePath));
    const legacyProfiles = await db.getUnsubmittedIdentityAccountsAsService();
    const legacyUploads = await Promise.all(
      legacyProfiles.map(async (profile) => {
        const objects: { name: string; created_at?: string | null }[] = [];
        for (let offset = 0; ; offset += 100) {
          const { data: page, error } = await supabase.storage
            .from("identity-documents")
            .list(profile.id, { limit: 100, offset });
          if (error) throw new Error(`Could not list private uploads for ${profile.email}: ${error.message}`);
          objects.push(...(page ?? []));
          if (!page || page.length < 100) break;
        }
        return Promise.all(
          (objects ?? [])
            .map((object) => `${profile.id}/${object.name}`)
            .filter((path) => !knownPaths.has(path))
            .map(async (path) => {
              const { data, error: signError } = await supabase.storage
                .from("identity-documents")
                .createSignedUrl(path, 10 * 60);
              if (signError || !data) {
                throw new Error(`Could not create secure preview for ${profile.email}: ${signError?.message || "unknown storage error"}`);
              }
              return {
                id: path,
                userId: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                verificationStatus: profile.id_verification_status,
                accountStatus: profile.account_status,
                kind: "uploaded_file",
                uploadedAt: objects.find((object) => `${profile.id}/${object.name}` === path)?.created_at || "",
                url: data.signedUrl,
                storagePath: path,
              };
            }),
        );
      }),
    );
    return NextResponse.json({
      uploads: [...results, ...legacyUploads.flat()].map(
        ({ storagePath: _storagePath, ...upload }) => upload,
      ),
    });
  } catch (error: any) {
    return jsonError(error, "Could not load identity uploads.");
  }
}
