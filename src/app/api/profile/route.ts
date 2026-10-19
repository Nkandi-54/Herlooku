import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, publicUser, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);

    let workerProfile =
      activeUser.role === "worker"
        ? await db.getWorkerProfileByUserId(activeUser.id)
        : null;

    if (workerProfile) {
      // Workers must never see the platform hiring fee.
      const { hireFee, ...safeProfile } = workerProfile;
      workerProfile = safeProfile as any;
    }

    return NextResponse.json({
      user: publicUser(activeUser),
      workerProfile,
    });
  } catch (error: any) {
    return jsonError(error, "Could not load your profile.");
  }
}

export async function PUT(req: Request) {
  return handleUpdate(req);
}

export async function POST(req: Request) {
  return handleUpdate(req);
}

async function handleUpdate(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
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
      expectedDailySalary,
      expectedMonthlySalary,
      engagementTypes,
      yearsExperience,
      languages,
      skills,
      liveInAvailable,
    } = body;

    const updatedUser = await db.updateUser(activeUser.id, {
      ...(name && { name }),
      ...(location && { location }),
      ...(householdSize !== undefined && { householdSize }),
      ...(householdNotes !== undefined && { householdNotes }),
      ...(avatar !== undefined && { avatar }),
    });

    let updatedWorkerProfile = null;
    if (activeUser.role === "worker") {
      updatedWorkerProfile = await db.updateWorkerProfile(activeUser.id, {
        ...(headline !== undefined && { headline }),
        ...(bio !== undefined && { bio }),
        ...(services !== undefined && { services }),
        ...(expectedDailySalary !== undefined && {
          expectedDailySalary: Number(expectedDailySalary),
        }),
        ...(expectedMonthlySalary !== undefined && {
          expectedMonthlySalary: Number(expectedMonthlySalary),
        }),
        ...(engagementTypes !== undefined && { engagementTypes }),
        ...(yearsExperience !== undefined && {
          yearsExperience: Number(yearsExperience),
        }),
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
    return jsonError(error, "Could not update your profile.");
  }
}
