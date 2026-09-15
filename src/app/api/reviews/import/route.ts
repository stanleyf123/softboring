import { importReviewsForOwner } from "@/db/reviews";
import { InputError, parseImportReviews } from "@/lib/review-input";
import { getReviewOwner } from "@/lib/review-owner";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reviews = parseImportReviews(body);
    const owner = await getReviewOwner();
    const result = importReviewsForOwner(owner, reviews);
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
