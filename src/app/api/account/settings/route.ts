import { NextResponse } from "next/server";
import {
  clampWeekday,
  ensureUserSettings,
  updateUserSettings,
} from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";

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
      reminderEnabled?: unknown;
      reminderWeekday?: unknown;
    };

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
      reminderEnabled:
        typeof body.reminderEnabled === "boolean" ? body.reminderEnabled : undefined,
      reminderWeekday:
        body.reminderWeekday === undefined
          ? undefined
          : clampWeekday(body.reminderWeekday),
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
