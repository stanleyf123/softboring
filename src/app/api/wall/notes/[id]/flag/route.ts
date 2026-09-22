import { NextResponse } from "next/server";
import { attachFlagToDetail, flagWallNote } from "@/db/wall-flags";
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

    try {
      const result = flagWallNote(viewer.user!.id, id);
      const note = getWallNote(id, viewer.userId);
      return NextResponse.json({
        ...result,
        note: note ? attachFlagToDetail(note, viewer.userId) : null,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "FlagNotFoundError") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error instanceof Error && error.name === "FlagOwnNoteError") {
        return NextResponse.json({ error: "own_note" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("POST /api/wall/notes/[id]/flag failed", error);
    return NextResponse.json({ error: "Could not note this quietly." }, { status: 500 });
  }
}
