import { NextResponse } from "next/server";
import { listWallCollections, setCollectionMembership } from "@/db/wall-collections";
import { parseCollectionId } from "@/lib/wall-collections";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    if (!collectionId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    let noteId = "";
    let include: boolean | null = null;
    try {
      const payload = (await request.json()) as { noteId?: unknown; include?: unknown };
      if (typeof payload.noteId === "string") noteId = payload.noteId.trim();
      if (typeof payload.include === "boolean") include = payload.include;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_item" }, { status: 400 });
    }

    const parsedNoteId = parseCollectionId(noteId);
    if (!parsedNoteId || include == null) {
      return NextResponse.json({ error: "invalid_item" }, { status: 400 });
    }

    const result = setCollectionMembership(
      viewer.user!.id,
      collectionId,
      parsedNoteId,
      include,
    );
    if (!result.ok) {
      const status = result.reason === "missing" ? 404 : 409;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      included: result.included,
      noteId: parsedNoteId,
      collections: listWallCollections(viewer.user!.id),
    });
  } catch (error) {
    console.error("POST /api/wall/collections/[id]/items failed", error);
    return NextResponse.json({ error: "Could not tuck that note." }, { status: 500 });
  }
}
