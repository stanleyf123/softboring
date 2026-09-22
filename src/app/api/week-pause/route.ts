import { NextResponse } from "next/server";
import { ensureUserSettings } from "@/db/user-settings";
import {
  currentPauseWeekKey,
  isWeekPaused,
  setWeekPaused,
} from "@/db/week-pauses";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pausePayload(userId: string) {
  const settings = ensureUserSettings(userId);
  const weekKey = currentPauseWeekKey(new Date(), settings.timezone);
  return {
    weekKey,
    paused: isWeekPaused(userId, weekKey),
    timezone: settings.timezone,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    return NextResponse.json(pausePayload(user.id));
  } catch (error) {
    console.error("GET /api/week-pause failed", error);
    return NextResponse.json({ error: "Could not load this pause." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    let pausedFlag: unknown;
    try {
      const body = (await request.json()) as { paused?: unknown };
      pausedFlag = body.paused;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      throw error;
    }
    if (typeof pausedFlag !== "boolean") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const settings = ensureUserSettings(user.id);
    const weekKey = currentPauseWeekKey(new Date(), settings.timezone);
    const paused = setWeekPaused(user.id, weekKey, pausedFlag);
    return NextResponse.json({
      weekKey,
      paused,
      timezone: settings.timezone,
    });
  } catch (error) {
    console.error("PUT /api/week-pause failed", error);
    return NextResponse.json({ error: "Could not keep this pause." }, { status: 500 });
  }
}
