import { NextResponse } from "next/server";
import { listWallActivity } from "@/db/wall-activity";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await getWallViewer();
    const denied = requireSoftPlus(viewer.user, viewer.softPlus);
    if (denied) return denied;

    const url = new URL(request.url);
    const raw = Number(url.searchParams.get("limit") ?? "24");
    const limit = Number.isFinite(raw) ? raw : 24;
    const items = listWallActivity(limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/wall/activity failed", error);
    return NextResponse.json({ error: "Could not load wall activity." }, { status: 500 });
  }
}
