import { importReviewsForGuest } from "@/db/reviews";
import { getOrCreateGuestId } from "@/lib/guest";
import { InputError, parseImportReviews } from "@/lib/review-input";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reviews = parseImportReviews(body);
    const guestId = await getOrCreateGuestId();
    const result = importReviewsForGuest(guestId, reviews);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    console.error("POST /api/reviews/import failed", error);
    return NextResponse.json({ error: "Could not import reviews." }, { status: 500 });
  }
}
