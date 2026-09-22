import { NextResponse } from "next/server";
import {
  currentLetterWeekKey,
  getSoftLetterForWeek,
  listSoftLettersForYear,
  parseSoftLetterBody,
  saveCurrentSoftLetter,
  SOFT_LETTER_MAX,
} from "@/db/soft-letters";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { letterWeekKey } from "@/lib/soft-letter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plusRequired() {
  return NextResponse.json({ error: "soft_plus_required" }, { status: 403 });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    const settings = ensureUserSettings(user.id);
    const url = new URL(request.url);
    const yearRaw = url.searchParams.get("year");
    if (yearRaw !== null) {
      const year = Number(yearRaw);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: "invalid_year" }, { status: 400 });
      }
      return NextResponse.json({
        year,
        letters: listSoftLettersForYear(user.id, year),
        maxLength: SOFT_LETTER_MAX,
      });
    }

    const atRaw = url.searchParams.get("at");
    let weekKey = currentLetterWeekKey(user.id);
    if (atRaw !== null) {
      const at = new Date(atRaw);
      if (Number.isNaN(at.getTime())) {
        return NextResponse.json({ error: "invalid_at" }, { status: 400 });
      }
      weekKey = letterWeekKey(at, settings.timezone);
    }

    return NextResponse.json({
      weekKey,
      maxLength: SOFT_LETTER_MAX,
      letter: getSoftLetterForWeek(user.id, weekKey),
      current: weekKey === currentLetterWeekKey(user.id),
    });
  } catch (error) {
    console.error("GET /api/soft-letters failed", error);
    return NextResponse.json({ error: "Could not load soft letter." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    let rawBody: unknown = "";
    try {
      const payload = (await request.json()) as { body?: unknown };
      rawBody = payload.body;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (rawBody === null || rawBody === undefined || typeof rawBody !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const trimmed = rawBody.trim();
    const body = trimmed.length === 0 ? null : parseSoftLetterBody(rawBody);
    if (trimmed.length > 0 && !body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const letter = saveCurrentSoftLetter(user.id, body);
    return NextResponse.json({
      weekKey: currentLetterWeekKey(user.id),
      maxLength: SOFT_LETTER_MAX,
      letter,
      current: true,
    });
  } catch (error) {
    console.error("PUT /api/soft-letters failed", error);
    return NextResponse.json({ error: "Could not save soft letter." }, { status: 500 });
  }
}
