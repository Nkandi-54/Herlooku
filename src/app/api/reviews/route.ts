import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { jsonError, requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews
 *
 * Body: { bookingId, workerId, rating, comment }
 *
 * A client may review only their own COMPLETED booking. The RLS policy on
 * public.reviews enforces this independently of this handler.
 */
export async function POST(req: Request) {
  try {
    const activeUser = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { bookingId, workerId, rating, comment } = body;

    if (!bookingId || !workerId || !rating || !comment) {
      return NextResponse.json(
        {
          error:
            "Missing required review fields (bookingId, workerId, rating, comment).",
        },
        { status: 400 },
      );
    }

    const numericRating = Number(rating);
    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 },
      );
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: bookingId,
        client_id: activeUser.id,
        client_name: activeUser.name,
        client_avatar: activeUser.avatar || "",
        worker_id: workerId,
        rating: numericRating,
        comment: String(comment),
      })
      .select("*")
      .single();

    if (error) {
      // Unique violation = this booking already has a review.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this booking." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      review: data,
      message: "Thank you! Your verified review has been published.",
    });
  } catch (error: any) {
    return jsonError(error, "Could not publish the review.");
  }
}
