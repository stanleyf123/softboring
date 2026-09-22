import { NextResponse } from "next/server";
import {
  currentWeekKey,
  getCurrentSoftNote,
  parseSoftNoteBody,
  saveCurrentSoftNote,
  SOFT_NOTE_MAX,
} from "@/db/soft-notes";
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
    const note = getCurrentSoftNote(user.id);
    return NextResponse.json({
      weekKey,
      maxLength: SOFT_NOTE_MAX,
      note,
    });
  } catch (error) {
    console.error("GET /api/soft-notes failed", error);
    return NextResponse.json({ error: "Could not load soft note." }, { status: 500 });
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

    // Empty string clears the note; null/undefined rejected.
    if (rawBody === null || rawBody === undefined) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (typeof rawBody !== "string") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const trimmed = rawBody.trim();
    const body = trimmed.length === 0 ? null : parseSoftNoteBody(rawBody);
    if (trimmed.length > 0 && !body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const note = saveCurrentSoftNote(user.id, body);
    return NextResponse.json({
      weekKey: currentWeekKey(),
      maxLength: SOFT_NOTE_MAX,
      note,
    });
  } catch (error) {
    console.error("PUT /api/soft-notes failed", error);
    return NextResponse.json({ error: "Could not save soft note." }, { status: 500 });
  }
}
