import { NextResponse } from "next/server";
import { listReviewsForOwner } from "@/db/reviews";
import { getReviewAccess } from "@/lib/review-access";
import { keywordChips, weeklyStreak } from "@/lib/plus-insights";
import { requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    const locked = requireSoftPlus(access.user, access.softPlus);
    if (locked) return locked;

    const reviews = listReviewsForOwner(access.owner);
    const chronological = [...reviews].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const points = chronological
      .filter((review) => review.feeling != null)
      .map((review) => ({
        id: review.id,
        createdAt: review.createdAt,
        feeling: review.feeling as number,
      }));

    return NextResponse.json({
      points,
      streak: weeklyStreak(reviews.map((review) => review.createdAt)),
      energyKeywords: keywordChips(reviews.map((review) => review.energy)),
      drainKeywords: keywordChips(reviews.map((review) => review.drain)),
    });
  } catch (error) {
    console.error("GET /api/reviews/trends failed", error);
    return NextResponse.json({ error: "Could not load trends." }, { status: 500 });
  }
}
