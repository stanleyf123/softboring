import { NextResponse } from "next/server";
import {
  currentWeekKey,
  getCurrentSoftIntention,
  getLastSoftIntention,
  parseSoftIntentionBody,
  saveCurrentSoftIntention,
  SOFT_INTENTION_MAX,
} from "@/db/soft-intentions";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    const weekKey = currentWeekKey();
    const intention = getCurrentSoftIntention(user.id);
    const last = getLastSoftIntention(user.id);
    return NextResponse.json({
      weekKey,
      maxLength: SOFT_INTENTION_MAX,
      intention,
      last,
    });
  } catch (error) {
    console.error("GET /api/soft-intentions failed", error);
    return NextResponse.json(
      { error: "Could not load soft intention." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    let rawBody: unknown = "";
    try {
      const payload = (await request.json()) as { body?: unknown };
      rawBody = payload.body;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (rawBody === null || rawBody === undefined) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (typeof rawBody !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const trimmed = rawBody.trim();
    const body = trimmed.length === 0 ? null : parseSoftIntentionBody(rawBody);
    if (trimmed.length > 0 && !body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const intention = saveCurrentSoftIntention(user.id, body);
    return NextResponse.json({
      weekKey: currentWeekKey(),
      maxLength: SOFT_INTENTION_MAX,
      intention,
      last: getLastSoftIntention(user.id),
    });
  } catch (error) {
    console.error("PUT /api/soft-intentions failed", error);
    return NextResponse.json(
      { error: "Could not save soft intention." },
      { status: 500 },
    );
  }
}
