import { NextResponse } from "next/server";
import { listBookmarksForExport } from "@/db/wall-bookmarks";
import { listWallCollections } from "@/db/wall-collections";
import {
  COLLECTIONS_EXPORT_FILENAME,
  collectionsExportBody,
} from "@/lib/collections-export";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const body = collectionsExportBody({
      collections: listWallCollections(viewer.user!.id),
      bookmarks: listBookmarksForExport(viewer.user!.id),
      exportedAt: new Date().toISOString(),
    });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${COLLECTIONS_EXPORT_FILENAME}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/wall/collections/export failed", error);
    return NextResponse.json({ error: "Could not download collections." }, { status: 500 });
  }
}
