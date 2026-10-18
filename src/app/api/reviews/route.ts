import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Review } from "@/types";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const activeUser = requireAuthenticatedUser(req);
    const body = await req.json();
    const { bookingId, workerId, rating, comment } = body;

    if (!bookingId || !workerId || !rating || !comment) {
      return NextResponse.json(
        { error: "Missing required review fields (bookingId, workerId, rating, comment)." },
        { status: 400 }
      );
    }

    const booking = db.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.clientId !== activeUser.id && activeUser.role !== "admin") {
      return NextResponse.json(
        { error: "You can only review bookings made by your account." },
        { status: 403 }
      );
    }

    const newReview: Review = {
      id: "rev_" + Date.now().toString(36),
      bookingId,
      clientId: activeUser.id,
      clientName: activeUser.name,
      clientAvatar: activeUser.avatar,
      workerId,
      rating: Number(rating),
      comment,
      date: new Date().toISOString().split("T")[0],
    };

    const created = db.addReview(newReview);

    return NextResponse.json({
      success: true,
      review: created,
      message: "Thank you! Your verified review has been published.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message === "UNAUTHENTICATED" ? "Sign in required." : error.message }, { status: error.message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

