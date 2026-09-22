import { NextResponse } from "next/server";
import { placeSticker } from "@/db/stickers";
import { withViewerNoteState } from "@/db/wall-note-view";
import { getWallNote } from "@/db/wall";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const note = getWallNote(id, viewer.userId);
    if (!note) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    let stickerId = "";
    try {
      const body = (await request.json()) as { stickerId?: unknown };
      if (typeof body.stickerId === "string") stickerId = body.stickerId.trim();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    if (!stickerId) {
      return NextResponse.json({ error: "sticker_required" }, { status: 400 });
    }

    const result = placeSticker({
      noteId: id,
      userId: viewer.user!.id,
      stickerId,
    });
    if (!result.ok) {
      const status = result.error === "unknown" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    const updated = getWallNote(id, viewer.userId);
    return NextResponse.json({
      praiseCount: result.praiseCount,
      note: updated ? withViewerNoteState(updated, viewer.userId) : updated,
    });
  } catch (error) {
    console.error("POST /api/wall/notes/[id]/stickers failed", error);
    return NextResponse.json({ error: "Could not place this sticker." }, { status: 500 });
  }
}
