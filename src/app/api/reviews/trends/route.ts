import { listReviewsForOwner } from "@/db/reviews";
import { getReviewAccess } from "@/lib/review-access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    if (!access.softPlus) {
      return NextResponse.json({ error: "locked", locked: true }, { status: 403 });
    }

    const reviews = listReviewsForOwner(access.owner);
    const points = reviews
      .filter((review) => review.feeling != null)
      .map((review) => ({
        id: review.id,
        createdAt: review.createdAt,
        feeling: review.feeling as number,
      }))
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    return NextResponse.json({ points });
  } catch (error) {
    console.error("GET /api/reviews/trends failed", error);
    return NextResponse.json({ error: "Could not load trends." }, { status: 500 });
  }
}
