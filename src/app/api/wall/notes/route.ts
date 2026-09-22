import { NextResponse } from "next/server";
import { getLatestReviewIdForUser, getReviewForOwner, listReviewsForOwner } from "@/db/reviews";
import { ensureUserSettings, updateUserSettings } from "@/db/user-settings";
import { withEchoes } from "@/db/wall-echoes";
import { withBookmarkFlag } from "@/db/wall-bookmarks";
import { withThanks } from "@/db/wall-thanks";
import { getWallNoteIdForReview, listVisibleWallNotes, shareWallNote } from "@/db/wall";
import { isHistoryIndexUnlocked } from "@/lib/history-access";
import { getReviewAccess } from "@/lib/review-access";
import { wallSharePayload } from "@/lib/wall-share";
import { getWallViewer, requireUser } from "@/lib/wall-access";
import {
  isPlusNoteColor,
  isWallColor,
  toTeaserNote,
} from "@/lib/wall-canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const notes = withThanks(listVisibleWallNotes(viewer.userId), viewer.userId);
    const latestOwnedReviewId = viewer.userId
      ? getLatestReviewIdForUser(viewer.userId)
      : null;
    if (!viewer.softPlus) {
      return NextResponse.json({
        locked: true,
        softPlus: false,
        signedIn: viewer.signedIn,
        latestOwnedReviewId: viewer.signedIn ? latestOwnedReviewId : null,
        notes: notes.map(toTeaserNote),
      });
    }
    return NextResponse.json({
      locked: false,
      softPlus: true,
      signedIn: true,
      latestOwnedReviewId,
      notes: withEchoes(withBookmarkFlag(notes, viewer.userId), viewer.userId),
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
    let requestedColor: string | null = null;
    try {
      const body = (await request.json()) as { reviewId?: unknown; color?: unknown };
      if (typeof body.reviewId === "string") reviewId = body.reviewId.trim();
      if (typeof body.color === "string") requestedColor = body.color.trim();
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

    const settings = ensureUserSettings(access.owner.userId);
    const explicitWall = requestedColor != null && isWallColor(requestedColor);

    const existingId = getWallNoteIdForReview(reviewId);
    const note = shareWallNote({
      reviewId,
      userId: access.owner.userId,
      color: requestedColor,
      softPlus: access.softPlus,
      preferredWallColor: settings.preferredWallColor,
      customNoteColor: settings.customNoteColor,
    });

    if (access.softPlus && !existingId) {
      if (isPlusNoteColor(note.color)) {
        updateUserSettings(access.owner.userId, { customNoteColor: note.color });
      } else if (isWallColor(note.color)) {
        updateUserSettings(access.owner.userId, {
          preferredWallColor: note.color,
          ...(explicitWall ? { customNoteColor: null } : {}),
        });
      }
    }

    const payload = wallSharePayload(note);

    return NextResponse.json(payload, { status: existingId ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "WallForbiddenError") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("POST /api/wall/notes failed", error);
    return NextResponse.json({ error: "Could not share this review." }, { status: 500 });
  }
}
