import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonError,
  publicUser,
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { isAdminRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);

    if (isAdminRole(activeUser.role)) {
      const allUsers = await db.getUsers();

      const byStatus = (status: string) =>
        allUsers
          .filter((u) => u.idVerificationStatus === status)
          .map(publicUser);

      return NextResponse.json({
        pendingVerifications: byStatus("pending"),
        verifiedUsers: byStatus("verified"),
        rejectedUsers: byStatus("rejected"),
        activeUser: publicUser(activeUser),
      });
    }

    return NextResponse.json({
      status: activeUser.idVerificationStatus,
      user: publicUser(activeUser),
    });
  } catch (error: any) {
    return jsonError(error, "Could not load verification status.");
  }
}

/**
 * POST /api/verification
 *
 * Body: { idType, idNumber, idDocumentUrl, idDocumentBackUrl?, selfieUrl }
 *
 * Records the submitted identity documents and moves the account to "pending".
 * Documents must already be uploaded to the private identity-documents bucket
 * via /api/upload; only storage paths are stored here.
 */
export async function POST(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { idType, idNumber, idDocumentUrl, idDocumentBackUrl, selfieUrl } = body;

    if (!idType || !idNumber || !idDocumentUrl || !selfieUrl) {
      return NextResponse.json(
        {
          error:
            "Please provide ID type, document number, document photo, and selfie.",
        },
        { status: 400 },
      );
    }

    const normalizedIdNumber = String(idNumber).trim();
    if (normalizedIdNumber.length < 2 || normalizedIdNumber.length > 100) {
      return NextResponse.json(
        { error: "Enter a valid document identification number." },
        { status: 400 },
      );
    }

    if (!["national_id", "passport", "drivers_license"].includes(idType)) {
      return NextResponse.json(
        { error: "Unsupported document type." },
        { status: 400 },
      );
    }

    if (
      activeUser.idVerificationStatus === "pending" ||
      activeUser.idVerificationStatus === "verified"
    ) {
      return NextResponse.json(
        { error: "Your verification is already submitted or approved." },
        { status: 409 },
      );
    }

    const supabase = await createServerSupabase();
    const documentPaths = [
      idDocumentUrl,
      selfieUrl,
      ...(idDocumentBackUrl ? [idDocumentBackUrl] : []),
    ];
    for (const value of documentPaths) {
      if (
        typeof value !== "string" ||
        !value.startsWith(`${activeUser.id}/`) ||
        value.includes("..")
      ) {
        return NextResponse.json(
          { error: "Please upload each required photo again before submitting." },
          { status: 400 },
        );
      }

      const { error } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(value, 60);
      if (error) {
        return NextResponse.json(
          { error: "One or more photos could not be found in secure storage. Please upload them again." },
          { status: 400 },
        );
      }
    }

    const updatedUser = await db.submitIdVerification(
      activeUser.id,
      idType,
      normalizedIdNumber,
      String(idDocumentUrl),
      String(selfieUrl),
      idDocumentBackUrl ? String(idDocumentBackUrl) : undefined,
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Could not save your verification submission." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      user: publicUser(updatedUser),
      message:
        "Identity verification submitted successfully! Our compliance team will review your credentials shortly.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not submit verification.");
  }
}

// Referenced so the admin import is retained for the review flow surface.
void requireAdminUser;
