import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let activeUser;
  try { activeUser = requireAuthenticatedUser(req); } catch { return NextResponse.json({ error: "Sign in required." }, { status: 401 }); }

  if (activeUser.role === "admin") {
    const allUsers = db.getUsers();
    const pendingVerifications = allUsers.filter(
      (u) => u.idVerificationStatus === "pending"
    );
    const verifiedUsers = allUsers.filter(
      (u) => u.idVerificationStatus === "verified"
    );
    const rejectedUsers = allUsers.filter(
      (u) => u.idVerificationStatus === "rejected"
    );

    return NextResponse.json({
      pendingVerifications: pendingVerifications.map(publicUser),
      verifiedUsers: verifiedUsers.map(publicUser),
      rejectedUsers: rejectedUsers.map(publicUser),
      activeUser: publicUser(activeUser),
    });
  }

  return NextResponse.json({
    status: activeUser.idVerificationStatus,
    user: publicUser(activeUser),
  });
}

export async function POST(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    const body = await req.json();
    const { idType, idNumber, idDocumentUrl, idDocumentBackUrl, selfieUrl } = body;

    if (!idType || !idNumber || !idDocumentUrl || !selfieUrl) {
      return NextResponse.json(
        { error: "Please provide ID type, document number, document photo, and selfie." },
        { status: 400 }
      );
    }

    const updatedUser = db.submitIdVerification(
      activeUser.id,
      idType,
      idNumber,
      idDocumentUrl,
      selfieUrl,
      idDocumentBackUrl
    );

    return NextResponse.json({
      success: true,
      user: publicUser(updatedUser),
      message:
        "Identity verification submitted successfully! Our compliance team will review your credentials shortly.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

