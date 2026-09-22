import { getReviewForOwner, listReviewsForOwner, setReviewMood } from "@/db/reviews";
import { getWallNoteIdForReview } from "@/db/wall";
import { isHistoryIndexUnlocked } from "@/lib/history-access";
import { getReviewAccess } from "@/lib/review-access";
import { InputError, parseMoodPatch } from "@/lib/review-input";
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

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const access = await getReviewAccess();
    if (access.owner.kind !== "user") {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    let mood;
    try {
      mood = parseMoodPatch(await request.json());
    } catch (error) {
      if (error instanceof InputError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
      }
      throw error;
    }

    const existing = getReviewForOwner(access.owner, id);
    if (!existing) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const all = listReviewsForOwner(access.owner);
    const index = all.findIndex((item) => item.id === id);
    if (index >= 0 && !isHistoryIndexUnlocked(index, access.softPlus)) {
      return NextResponse.json({ error: "locked", locked: true }, { status: 403 });
    }

    const review = setReviewMood(access.owner.userId, id, mood);
    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (error) {
    console.error("PATCH /api/reviews/[id] failed", error);
    return NextResponse.json({ error: "Could not update this review." }, { status: 500 });
  }
}
