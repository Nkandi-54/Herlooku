import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonError,
  publicUser,
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);

    if (activeUser.role === "admin") {
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
    const { idType, idNumber, idDocumentUrl, idDocumentBackUrl, selfieUrl } =
      body;

    if (!idType || !idNumber || !idDocumentUrl || !selfieUrl) {
      return NextResponse.json(
        {
          error:
            "Please provide ID type, document number, document photo, and selfie.",
        },
        { status: 400 },
      );
    }

    if (!["national_id", "passport", "drivers_license"].includes(idType)) {
      return NextResponse.json(
        { error: "Unsupported document type." },
        { status: 400 },
      );
    }

    const updatedUser = await db.submitIdVerification(
      activeUser.id,
      idType,
      String(idNumber),
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
