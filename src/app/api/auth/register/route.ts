import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CONSTANT_HIRING_FEE_USD } from "@/types";
import { hashPassword, publicUser, setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 *
 * Body: {
 *   name: string; email: string; password: string; phone: string;
 *   role: "client" | "worker";
 *   location?: string;
 *   // Worker-only extras:
 *   headline?: string; services?: string[]; expectedDailySalary?: number;
 * }
 *
 * New client and worker accounts start as `accountStatus: "pending"`. They can
 * sign in and complete ID verification, but they are NOT shown in the directory,
 * cannot book, and cannot be booked until an administrator approves the account.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      role,
      location,
      headline,
      services,
      expectedDailySalary,
    } = body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !phone?.trim() ||
      !role
    ) {
      return NextResponse.json(
        { error: "Name, email, password, phone and role are all required." },
        { status: 400 },
      );
    }

    if (!["client", "worker"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be either 'client' or 'worker'." },
        { status: 400 },
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Choose a password with at least 8 characters." },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    // Phone must be a plausible Kenyan number; it is used for dispatch.
    const normalizedPhone = String(phone).replace(/[\s\-()]/g, "");
    if (!/^(\+?254|0)[17]\d{8}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan phone number, e.g. 0712 345 678." },
        { status: 400 },
      );
    }

    if (db.getUserByEmail(normalizedEmail)) {
      return NextResponse.json(
        {
          error:
            "An account with this email address already exists. Please log in.",
        },
        { status: 409 },
      );
    }

    const id = "usr_" + crypto.randomUUID();
    const newUser = db.createUser({
      id,
      name: name.trim(),
      email: normalizedEmail,
      password: hashPassword(String(password)),
      role,
      phone: normalizedPhone,
      location: location?.trim() || "Kenya",
      // Neutral default avatar — no third-party tracking pixel or invented identity.
      avatar: "",
      idVerificationStatus: "unverified",
      // Invisible to the platform until an administrator approves the account.
      accountStatus: "pending",
      createdAt: new Date().toISOString(),
    });

    // Auto-create worker profile if registering as worker. It is not listed
    // publicly until the account AND ID verification are both approved.
    if (role === "worker") {
      db.updateWorkerProfile(id, {
        headline: headline?.trim() || "Domestic Helper",
        bio: "",
        services:
          Array.isArray(services) && services.length
            ? services
            : ["Housekeeping"],
        hireFee: CONSTANT_HIRING_FEE_USD,
        expectedDailySalary: Number(expectedDailySalary) || 8,
        expectedMonthlySalary: (Number(expectedDailySalary) || 8) * 26,
        engagementTypes: ["daily", "monthly"],
        location: location?.trim() || "Kenya",
        serviceRadiusKm: 20,
        yearsExperience: 0,
        rating: 0,
        reviewCount: 0,
        languages: ["English", "Swahili"],
        policeClearanceVerified: false,
        backgroundCheckVerified: false,
        referenceCount: 0,
        liveInAvailable: false,
        availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        skills: ["Cleaning", "Housekeeping"],
      });
    }

    return setSession(
      NextResponse.json(
        {
          success: true,
          activeUser: publicUser(newUser),
          message:
            "Account created. An administrator will review your account; you can complete ID verification while you wait.",
        },
        { status: 201 },
      ),
      id,
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Registration failed." },
      { status: 500 },
    );
  }
}
