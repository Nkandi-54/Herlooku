import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, publicWorkerUser } from "@/lib/auth";
import { isAdminRole } from "@/types";

export const dynamic = "force-dynamic";

function isPubliclyVisible(profile: {
  user: { idVerificationStatus: string; accountStatus?: string };
}) {
  return (
    profile.user.idVerificationStatus === "verified" &&
    profile.user.accountStatus === "approved"
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await db.getWorkerProfileByUserId(id);

  if (!profile) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const viewer = await getAuthenticatedUser(req);
  const isOwner = viewer?.id === id;
  const isAdmin = isAdminRole(viewer?.role);

  if (!isPubliclyVisible(profile) && !isOwner && !isAdmin) {
    // Indistinguishable from a non-existent worker so unapproved applicants
    // cannot be probed or enumerated.
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  const reviews = await db.getReviewsForWorker(id);
  const activeBookings = await db.getBookingsForWorker(id);

  const bookedDateRanges = activeBookings
    .filter(
      (b) => b.status === "confirmed_exclusive" || b.status === "in_progress",
    )
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
