import { getReviewForOwner, listReviewsForOwner } from "@/db/reviews";
import { getWallNoteIdForReview } from "@/db/wall";
import { isHistoryIndexUnlocked } from "@/lib/history-access";
import { getReviewAccess } from "@/lib/review-access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const access = await getReviewAccess();
    const review = getReviewForOwner(access.owner, id);
    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const all = listReviewsForOwner(access.owner);
    const index = all.findIndex((item) => item.id === id);
    if (index >= 0 && !isHistoryIndexUnlocked(index, access.softPlus)) {
      return NextResponse.json(
        { error: "locked", locked: true, createdAt: review.createdAt },
        { status: 403 },
      );
    }

    return NextResponse.json({
      review,
      wall: {
        noteId: access.owner.kind === "user" ? getWallNoteIdForReview(id) : null,
        canShare: access.owner.kind === "user",
      },
    });
  } catch (error) {
    console.error("GET /api/reviews/[id] failed", error);
    return NextResponse.json({ error: "Could not load review." }, { status: 500 });
  }
}
