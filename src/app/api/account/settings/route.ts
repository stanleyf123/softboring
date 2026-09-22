import { NextResponse } from "next/server";
import {
  clampWeekday,
  ensureUserSettings,
  updateUserSettings,
} from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { isFocusMinutes } from "@/lib/focus-timer";
import { isIanaTimeZone } from "@/lib/timezone";
import { isWallColor, type WallColor } from "@/lib/wall-canvas";

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
      timezone?: unknown;
      seasonalFrame?: unknown;
      focusMinutes?: unknown;
      focusChime?: unknown;
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
      timezone,
      seasonalFrame:
        typeof body.seasonalFrame === "boolean" ? body.seasonalFrame : undefined,
      focusMinutes: isFocusMinutes(body.focusMinutes) ? body.focusMinutes : undefined,
      focusChime: typeof body.focusChime === "boolean" ? body.focusChime : undefined,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("PATCH /api/account/settings failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
