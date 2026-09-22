import { NextResponse } from "next/server";
import {
  attachBookmarkToDetail,
  toggleWallNoteBookmark,
} from "@/db/wall-bookmarks";
import { getWallNote } from "@/db/wall";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const result = toggleWallNoteBookmark(viewer.user!.id, id);
    const note = getWallNote(id, viewer.userId);
    if (!note) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      bookmarked: result.bookmarked,
      note: attachBookmarkToDetail(note, viewer.userId),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "BookmarkNotFoundError") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("POST /api/wall/notes/[id]/bookmark failed", error);
    return NextResponse.json({ error: "Could not save this note." }, { status: 500 });
  }
}
