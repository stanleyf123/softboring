import { NextResponse } from "next/server";
import { createReview, listReviewsForOwner } from "@/db/reviews";
import { withHistoryAccess } from "@/lib/history-access";
import { visibleSoftTags } from "@/lib/soft-tags";
import { InputError, parseAnswers } from "@/lib/review-input";
import { accessPayload, getReviewAccess } from "@/lib/review-access";
import { streakMilestone, weeklyStreak } from "@/lib/plus-insights";
import { streakForUser } from "@/lib/review-streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    const all = listReviewsForOwner(access.owner);
    const reviews = withHistoryAccess(all, access.softPlus).map((review) => ({
      ...review,
      softTags: visibleSoftTags(review.softTags, access.softPlus, review.locked),
    }));
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
    if (!access.softPlus) {
      answers.customAnswers = [];
    }
    if (access.owner.kind !== "user") {
      answers.mood = null;
    }
    const review = createReview(access.owner, answers);
    const all = listReviewsForOwner(access.owner);
    const visible = withHistoryAccess(all, access.softPlus);
    const lockedCount = visible.filter((item) => item.locked).length;
    const createdAts = all.map((item) => item.createdAt);
    const streak =
      access.owner.kind === "user"
        ? streakForUser(access.owner.userId, createdAts)
        : weeklyStreak(createdAts);
    return NextResponse.json(
      {
        review,
        access: accessPayload(access, all.length, lockedCount),
        streak,
        milestone: streakMilestone(streak),
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
