import { NextResponse } from "next/server";
import { deleteWallCollection, listWallCollections, renameWallCollection } from "@/db/wall-collections";
import { parseCollectionId, parseCollectionName } from "@/lib/wall-collections";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    if (!collectionId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    let rawName: unknown = "";
    try {
      const payload = (await request.json()) as { name?: unknown };
      rawName = payload.name;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    if (!parseCollectionName(rawName)) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const result = renameWallCollection(viewer.user!.id, collectionId, rawName as string);
    if (!result.ok) {
      if (result.reason === "missing") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      const status = result.reason === "duplicate" ? 409 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      collection: result.collection,
      collections: listWallCollections(viewer.user!.id),
    });
  } catch (error) {
    console.error("PATCH /api/wall/collections/[id] failed", error);
    return NextResponse.json({ error: "Could not rename that collection." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    if (!collectionId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const removed = deleteWallCollection(viewer.user!.id, collectionId);
    if (!removed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      collections: listWallCollections(viewer.user!.id),
    });
  } catch (error) {
    console.error("DELETE /api/wall/collections/[id] failed", error);
    return NextResponse.json({ error: "Could not let that collection go." }, { status: 500 });
  }
}
