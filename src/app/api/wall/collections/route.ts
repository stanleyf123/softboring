import { NextResponse } from "next/server";
import { createWallCollection, listWallCollections } from "@/db/wall-collections";
import { COLLECTION_CAP, COLLECTION_NAME_MAX, parseCollectionName } from "@/lib/wall-collections";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const collections = listWallCollections(viewer.user!.id);
    return NextResponse.json({
      collections,
      cap: COLLECTION_CAP,
      nameMax: COLLECTION_NAME_MAX,
      softPlus: true,
    });
  } catch (error) {
    console.error("GET /api/wall/collections failed", error);
    return NextResponse.json({ error: "Could not load collections." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const result = createWallCollection(viewer.user!.id, rawName as string);
    if (!result.ok) {
      const status = result.reason === "full" ? 409 : result.reason === "duplicate" ? 409 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      collection: result.collection,
      collections: listWallCollections(viewer.user!.id),
      cap: COLLECTION_CAP,
    });
  } catch (error) {
    console.error("POST /api/wall/collections failed", error);
    return NextResponse.json({ error: "Could not make that collection." }, { status: 500 });
  }
}
