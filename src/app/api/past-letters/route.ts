import { NextResponse } from "next/server";
import {
  getPastSelfLetterForUser,
  listPastSelfLettersForUser,
  savePastSelfLetterForUser,
} from "@/db/past-self-letters";
import { getReviewForOwner } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import {
  isPastWeek,
  parsePastSelfLetterBody,
  PAST_SELF_LETTER_MAX,
  pastSelfWeekKey,
  presentPastLetterInbox,
} from "@/lib/past-self-letter";
import { userIsSoftPlus } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plusRequired() {
  return NextResponse.json({ error: "soft_plus_required", locked: true }, { status: 403 });
}

function reviewIdFrom(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    const reviewId = reviewIdFrom(new URL(request.url).searchParams.get("reviewId"));
    const settings = ensureUserSettings(user.id);
    if (!reviewId) {
      return NextResponse.json({
        letters: presentPastLetterInbox(
          listPastSelfLettersForUser(user.id),
          settings.timezone,
          new Date(),
        ),
        timeZone: settings.timezone,
      });
    }

    const review = getReviewForOwner({ kind: "user", userId: user.id, guestId: "" }, reviewId);
    if (!review) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      reviewId,
      weekKey: pastSelfWeekKey(new Date(review.createdAt), settings.timezone),
      past: isPastWeek(review.createdAt, new Date(), settings.timezone),
      maxLength: PAST_SELF_LETTER_MAX,
      letter: getPastSelfLetterForUser(user.id, reviewId),
    });
  } catch (error) {
    console.error("GET /api/past-letters failed", error);
    return NextResponse.json({ error: "Could not load that letter." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    let reviewId: string | null = null;
    let rawBody: unknown = "";
    try {
      const payload = (await request.json()) as { reviewId?: unknown; body?: unknown };
      reviewId = reviewIdFrom(payload.reviewId);
      rawBody = payload.body;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (!reviewId) {
      return NextResponse.json({ error: "review_required" }, { status: 400 });
    }
    if (rawBody !== null && rawBody !== undefined && typeof rawBody !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const review = getReviewForOwner({ kind: "user", userId: user.id, guestId: "" }, reviewId);
    if (!review) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const settings = ensureUserSettings(user.id);
    const past = isPastWeek(review.createdAt, new Date(), settings.timezone);
    if (!past) {
      return NextResponse.json({ error: "not_past" }, { status: 400 });
    }

    const trimmed = typeof rawBody === "string" ? rawBody.trim() : "";
    const body = trimmed.length === 0 ? null : parsePastSelfLetterBody(rawBody);
    if (trimmed.length > 0 && !body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const letter = savePastSelfLetterForUser({ userId: user.id, reviewId, body });
    return NextResponse.json({
      reviewId,
      weekKey: pastSelfWeekKey(new Date(review.createdAt), settings.timezone),
      past: true,
      maxLength: PAST_SELF_LETTER_MAX,
      letter,
    });
  } catch (error) {
    console.error("PUT /api/past-letters failed", error);
    return NextResponse.json({ error: "Could not save that letter." }, { status: 500 });
  }
}
