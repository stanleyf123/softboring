import { NextResponse } from "next/server";
import { getReviewForOwner } from "@/db/reviews";
import { listReviewsForOwner } from "@/db/reviews";
import { getWallNoteIdForReview, listVisibleWallNotes, shareWallNote } from "@/db/wall";
import { isHistoryIndexUnlocked } from "@/lib/history-access";
import { getReviewAccess } from "@/lib/review-access";
import { getWallViewer, requireUser } from "@/lib/wall-access";
import { toTeaserNote } from "@/lib/wall-canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const notes = listVisibleWallNotes(viewer.userId);
    if (!viewer.softPlus) {
      return NextResponse.json({
        locked: true,
        softPlus: false,
        signedIn: viewer.signedIn,
        notes: notes.map(toTeaserNote),
      });
    }
    return NextResponse.json({
      locked: false,
      softPlus: true,
      signedIn: true,
      notes,
    });
  } catch (error) {
    console.error("GET /api/wall/notes failed", error);
    return NextResponse.json({ error: "Could not load the wall." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getWallViewer();
    const unauthorized = requireUser(viewer.user);
    if (unauthorized) return unauthorized;

    let reviewId = "";
    try {
      const body = (await request.json()) as { reviewId?: unknown };
      if (typeof body.reviewId === "string") reviewId = body.reviewId.trim();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    if (!reviewId) {
      return NextResponse.json({ error: "review_required" }, { status: 400 });
    }

    const access = await getReviewAccess();
    if (access.owner.kind !== "user") {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const review = getReviewForOwner(access.owner, reviewId);
    if (!review) {
      return NextResponse.json({ error: "review_not_found" }, { status: 404 });
    }

    const all = listReviewsForOwner(access.owner);
    const index = all.findIndex((item) => item.id === reviewId);
    if (index >= 0 && !isHistoryIndexUnlocked(index, access.softPlus)) {
      return NextResponse.json({ error: "locked", locked: true }, { status: 403 });
    }

    const existingId = getWallNoteIdForReview(reviewId);
    const note = shareWallNote({
      reviewId,
      userId: access.owner.userId,
    });

    return NextResponse.json(
      { note, wallNoteId: note.id },
      { status: existingId ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "WallForbiddenError") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("POST /api/wall/notes failed", error);
    return NextResponse.json({ error: "Could not share this review." }, { status: 500 });
  }
}
