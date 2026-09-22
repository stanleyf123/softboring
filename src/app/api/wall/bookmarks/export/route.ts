import { NextResponse } from "next/server";
import { listBookmarkMembershipsForExport, listBookmarksForExport } from "@/db/wall-bookmarks";
import {
  BOOKMARKS_EXPORT_FILENAME,
  bookmarksExportBody,
} from "@/lib/bookmarks-export";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const body = bookmarksExportBody({
      bookmarks: listBookmarksForExport(viewer.user!.id),
      memberships: listBookmarkMembershipsForExport(viewer.user!.id),
      exportedAt: new Date().toISOString(),
    });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${BOOKMARKS_EXPORT_FILENAME}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/wall/bookmarks/export failed", error);
    return NextResponse.json({ error: "Could not download bookmarks." }, { status: 500 });
  }
}
