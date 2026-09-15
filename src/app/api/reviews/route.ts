import { NextResponse } from "next/server";
import { createReview, listReviewsForOwner } from "@/db/reviews";
import { InputError, parseAnswers } from "@/lib/review-input";
import { getReviewOwner } from "@/lib/review-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const owner = await getReviewOwner();
    const reviews = listReviewsForOwner(owner);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET /api/reviews failed", error);
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const answers = parseAnswers(body);
    const owner = await getReviewOwner();
    const review = createReview(owner, answers);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    console.error("POST /api/reviews failed", error);
    return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  }
}
