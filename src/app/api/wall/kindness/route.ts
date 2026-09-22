import { NextResponse } from "next/server";
import { listKindnessDigest } from "@/db/wall-kindness";
import { ensureUserSettings } from "@/db/user-settings";
import { kindnessWeekStart } from "@/lib/wall-kindness";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const denied = requireSoftPlus(viewer.user, viewer.softPlus);
    if (denied) return denied;

    const settings = ensureUserSettings(viewer.user!.id);
    const now = new Date();
    const weekStart = kindnessWeekStart(now, settings.timezone);
    const digest = listKindnessDigest(viewer.user!.id, weekStart, settings.timezone, now);
    return NextResponse.json({
      weekKey: digest.weekKey,
      since: digest.since,
      timeZone: settings.timezone,
      thanks: digest.thanks,
      echoes: digest.echoes,
    });
  } catch (error) {
    console.error("GET /api/wall/kindness failed", error);
    return NextResponse.json({ error: "Could not load this week's kindness." }, { status: 500 });
  }
}
