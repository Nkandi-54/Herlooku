import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, publicWorkerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * A worker profile is only ever exposed once the account is approved AND the
 * worker's ID verification has passed. Anyone else requesting the profile gets a
 * 404 — this keeps unapproved applicants completely invisible to the public.
 * The worker themself and administrators may still read the profile.
 */
function isPubliclyVisible(profile: { user: { id: string; idVerificationStatus: string; accountStatus?: string } }) {
  return (
    profile.user.idVerificationStatus === "verified" &&
    profile.user.accountStatus === "approved"
  );
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const profile = db.getWorkerProfileByUserId(id);

  if (!profile) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const viewer = getAuthenticatedUser(req);
  const isOwner = viewer?.id === id;
  const isAdmin = viewer?.role === "admin";
  if (!isPubliclyVisible(profile) && !isOwner && !isAdmin) {
    // Deliberately indistinguishable from a non-existent worker so unapproved
    // applicants cannot be probed or enumerated.
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const reviews = db.getReviewsForWorker(id);
  const activeBookings = db.getBookingsForWorker(id);

  // Extract booked dates ranges so client calendar knows which dates are locked
  const bookedDateRanges = activeBookings
    .filter((b) => b.status === "confirmed_exclusive" || b.status === "in_progress")
    .map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
      bookingRef: b.bookingRef,
    }));

  return NextResponse.json({
    profile: { ...profile, user: publicWorkerUser(profile.user) },
    reviews,
    bookedDateRanges,
  });
}

