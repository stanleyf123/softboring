import { NextResponse } from "next/server";
import { listBookmarkedWallNotes } from "@/db/wall-bookmarks";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const notes = listBookmarkedWallNotes(viewer.user!.id);
    return NextResponse.json({ notes, softPlus: true });
  } catch (error) {
    console.error("GET /api/wall/bookmarks failed", error);
    return NextResponse.json({ error: "Could not load saved notes." }, { status: 500 });
  }
}
