import { NextResponse } from "next/server";
import { ensureUserSettings } from "@/db/user-settings";
import { listNeighborHighlights } from "@/db/wall-highlights";
import { startOfIsoWeek } from "@/lib/timezone";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const denied = requireSoftPlus(viewer.user, viewer.softPlus);
    if (denied) return denied;

    const settings = ensureUserSettings(viewer.user!.id);
    const since = startOfIsoWeek(new Date(), settings.timezone).toISOString();
    const items = listNeighborHighlights(since);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/wall/highlights failed", error);
    return NextResponse.json({ error: "Could not load neighbor highlights." }, { status: 500 });
  }
}
