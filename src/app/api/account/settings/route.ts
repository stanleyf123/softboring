import { NextResponse } from "next/server";
import {
  clampWeekday,
  ensureUserSettings,
  updateUserSettings,
} from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { isFocusMinutes } from "@/lib/focus-timer";
import { NIGHT_COOKIE, nightCookieOptions } from "@/lib/night-mode";
import { userIsSoftPlus } from "@/lib/plan";
import { isIanaTimeZone } from "@/lib/timezone";
import { isPlusNoteColor, isWallColor, type PlusNoteColor, type WallColor } from "@/lib/wall-canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ settings: ensureUserSettings(user.id) });
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      onboardingDismissed?: unknown;
      onboardingHistorySeen?: unknown;
      onboardingWallSeen?: unknown;
      onboardingTimezoneSet?: unknown;
      reminderEnabled?: unknown;
      reminderWeekday?: unknown;
      preferredWallColor?: unknown;
      customNoteColor?: unknown;
      timezone?: unknown;
      seasonalFrame?: unknown;
      focusMinutes?: unknown;
      focusChime?: unknown;
      nightMode?: unknown;
      memoryLane?: unknown;
      wallLargerText?: unknown;
    };

    let preferredWallColor: WallColor | null | undefined;
    if (body.preferredWallColor === null) {
      preferredWallColor = null;
    } else if (
      typeof body.preferredWallColor === "string" &&
      isWallColor(body.preferredWallColor)
    ) {
      preferredWallColor = body.preferredWallColor;
    } else {
      preferredWallColor = undefined;
    }

    let customNoteColor: PlusNoteColor | null | undefined;
    if (body.customNoteColor === undefined) {
      customNoteColor = undefined;
    } else if (body.customNoteColor === null) {
      customNoteColor = null;
    } else if (
      typeof body.customNoteColor === "string" &&
      isPlusNoteColor(body.customNoteColor)
    ) {
      customNoteColor = body.customNoteColor;
    } else {
      return NextResponse.json({ error: "invalid_color" }, { status: 400 });
    }
    if (customNoteColor !== undefined && !userIsSoftPlus(user)) {
      return NextResponse.json(
        { error: "soft_plus_required", locked: true },
        { status: 403 },
      );
    }

    let timezone: string | undefined;
    if (body.timezone !== undefined) {
      if (typeof body.timezone !== "string" || !isIanaTimeZone(body.timezone.trim())) {
        return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
      }
      timezone = body.timezone.trim();
    }

    if (body.focusMinutes !== undefined && !isFocusMinutes(body.focusMinutes)) {
      return NextResponse.json({ error: "invalid_focus" }, { status: 400 });
    }
    if (body.focusChime !== undefined && typeof body.focusChime !== "boolean") {
      return NextResponse.json({ error: "invalid_focus" }, { status: 400 });
    }
    if (body.nightMode !== undefined && typeof body.nightMode !== "boolean") {
      return NextResponse.json({ error: "invalid_night" }, { status: 400 });
    }
    if (body.memoryLane !== undefined && typeof body.memoryLane !== "boolean") {
      return NextResponse.json({ error: "invalid_memory_lane" }, { status: 400 });
    }
    if (body.wallLargerText !== undefined && typeof body.wallLargerText !== "boolean") {
      return NextResponse.json({ error: "invalid_wall_text" }, { status: 400 });
    }

    const settings = updateUserSettings(user.id, {
      onboardingDismissed:
        typeof body.onboardingDismissed === "boolean"
          ? body.onboardingDismissed
          : undefined,
      onboardingHistorySeen:
        typeof body.onboardingHistorySeen === "boolean"
          ? body.onboardingHistorySeen
          : undefined,
      onboardingWallSeen:
        typeof body.onboardingWallSeen === "boolean"
          ? body.onboardingWallSeen
          : undefined,
      onboardingTimezoneSet:
        typeof body.onboardingTimezoneSet === "boolean"
          ? body.onboardingTimezoneSet
          : undefined,
      reminderEnabled:
        typeof body.reminderEnabled === "boolean" ? body.reminderEnabled : undefined,
      reminderWeekday:
        body.reminderWeekday === undefined
          ? undefined
          : clampWeekday(body.reminderWeekday),
      preferredWallColor,
      customNoteColor,
      timezone,
      seasonalFrame:
        typeof body.seasonalFrame === "boolean" ? body.seasonalFrame : undefined,
      focusMinutes: isFocusMinutes(body.focusMinutes) ? body.focusMinutes : undefined,
      focusChime: typeof body.focusChime === "boolean" ? body.focusChime : undefined,
      nightMode: typeof body.nightMode === "boolean" ? body.nightMode : undefined,
      memoryLane: typeof body.memoryLane === "boolean" ? body.memoryLane : undefined,
      wallLargerText:
        typeof body.wallLargerText === "boolean" ? body.wallLargerText : undefined,
    });

    const response = NextResponse.json({ settings });
    if (typeof body.nightMode === "boolean") {
      response.cookies.set(NIGHT_COOKIE, body.nightMode ? "1" : "0", nightCookieOptions());
    }
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("PATCH /api/account/settings failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
