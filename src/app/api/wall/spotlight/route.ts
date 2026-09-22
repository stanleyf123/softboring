import { NextResponse } from "next/server";
import { listWallSpotlight } from "@/db/wall-spotlight";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await getWallViewer();
    const denied = requireSoftPlus(viewer.user, viewer.softPlus);
    if (denied) return denied;

    const url = new URL(request.url);
    const raw = Number(url.searchParams.get("limit") ?? "5");
    const limit = Number.isFinite(raw) ? raw : 5;
    const items = listWallSpotlight(limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/wall/spotlight failed", error);
    return NextResponse.json({ error: "Could not load wall spotlight." }, { status: 500 });
  }
}
