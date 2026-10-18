import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthenticatedUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let activeUser;
  try { activeUser = requireAuthenticatedUser(req); } catch { return NextResponse.json({ error: "Sign in required." }, { status: 401 }); }
  let workerProfile =
    activeUser.role === "worker"
      ? db.getWorkerProfileByUserId(activeUser.id)
      : null;

  if (workerProfile && activeUser.role === "worker") {
    // Workers can see their expected daily salary, but must never see the platform hiring fee or payment details.
    const { hireFee, ...safeProfile } = workerProfile;
    workerProfile = safeProfile as any;
  }

  return NextResponse.json({
    user: publicUser(activeUser),
    workerProfile,
  });
}

export async function PUT(req: Request) {
  return handleUpdate(req);
}

export async function POST(req: Request) {
  return handleUpdate(req);
}

async function handleUpdate(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    const body = await req.json();
    const {
      name,
      location,
      householdSize,
      householdNotes,
      avatar,
      // Worker fields
      headline,
      bio,
      services,
      hireFee,
      expectedDailySalary,
      yearsExperience,
      languages,
      skills,
      liveInAvailable,
    } = body;

    // Update user record
    const updatedUser = db.updateUser(activeUser.id, {
      ...(name && { name }),
      ...(location && { location }),
      ...(householdSize !== undefined && { householdSize }),
      ...(householdNotes !== undefined && { householdNotes }),
      ...(avatar && { avatar }),
    });

    // If worker, update worker profile
    let updatedWorkerProfile = null;
    if (activeUser.role === "worker") {
      updatedWorkerProfile = db.updateWorkerProfile(activeUser.id, {
        ...(headline !== undefined && { headline }),
        ...(bio !== undefined && { bio }),
        ...(services !== undefined && { services }),
        ...(expectedDailySalary !== undefined && { expectedDailySalary: Number(expectedDailySalary) }),
        ...(hireFee !== undefined && { hireFee: Number(hireFee) }),
        ...(yearsExperience !== undefined && { yearsExperience: Number(yearsExperience) }),
        ...(languages !== undefined && { languages }),
        ...(skills !== undefined && { skills }),
        ...(liveInAvailable !== undefined && { liveInAvailable }),
        ...(location && { location }),
      });
      if (updatedWorkerProfile) {
        const { hireFee: _hf, ...safeUpdatedProfile } = updatedWorkerProfile;
        updatedWorkerProfile = safeUpdatedProfile as any;
      }
    }

    return NextResponse.json({
      success: true,
      user: publicUser(updatedUser),
      workerProfile: updatedWorkerProfile,
      message: "Profile updated successfully!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

