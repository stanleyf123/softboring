import { NextResponse } from "next/server";
import { createReview, listReviewsForOwner } from "@/db/reviews";
import { withHistoryAccess } from "@/lib/history-access";
import { InputError, parseAnswers } from "@/lib/review-input";
import { accessPayload, getReviewAccess } from "@/lib/review-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    const all = listReviewsForOwner(access.owner);
    const reviews = withHistoryAccess(all, access.softPlus);
    const lockedCount = reviews.filter((review) => review.locked).length;
    return NextResponse.json({
      reviews,
      access: accessPayload(access, all.length, lockedCount),
    });
  } catch (error) {
    console.error("GET /api/reviews failed", error);
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const answers = parseAnswers(body);
    const access = await getReviewAccess();
    const review = createReview(access.owner, answers);
    const all = listReviewsForOwner(access.owner);
    const visible = withHistoryAccess(all, access.softPlus);
    const lockedCount = visible.filter((item) => item.locked).length;
    return NextResponse.json(
      {
        review,
        access: accessPayload(access, all.length, lockedCount),
      },
      { status: 201 },
    );
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
