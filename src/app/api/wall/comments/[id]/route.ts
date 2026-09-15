import { NextResponse } from "next/server";
import { deleteWallCommentForUser } from "@/db/wall";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const changes = deleteWallCommentForUser(id, viewer.user!.id);
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wall/comments/[id] failed", error);
    return NextResponse.json({ error: "Could not delete this comment." }, { status: 500 });
  }
}
