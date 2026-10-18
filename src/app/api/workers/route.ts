import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicWorkerUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");
  const maxPrice = searchParams.get("maxPrice");
  const minRating = searchParams.get("minRating");
  const search = searchParams.get("search");
  // Directory results are always verified. Pending applicant data is private.

  let profiles = db.getWorkerProfiles(true);

  if (service && service !== "All") {
    profiles = profiles.filter((p) =>
      p.services.some((s) => s.toLowerCase() === service.toLowerCase())
    );
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    if (!isNaN(max) && max > 0) {
      profiles = profiles.filter((p) => p.hireFee <= max);
    }
  }

  if (minRating) {
    const min = Number(minRating);
    if (!isNaN(min)) {
      profiles = profiles.filter((p) => p.rating >= min);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    profiles = profiles.filter(
      (p) =>
        p.user.name.toLowerCase().includes(q) ||
        p.headline.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.services.some((s) => s.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ profiles: profiles.map((profile) => ({ ...profile, user: publicWorkerUser(profile.user) })) });
}

