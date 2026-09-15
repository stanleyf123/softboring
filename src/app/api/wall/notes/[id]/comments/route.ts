import { NextResponse } from "next/server";
import { createNotification } from "@/db/notifications";
import { addWallComment, getWallNote, listWallComments } from "@/db/wall";
import { getWallViewer, parseCommentBody, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const note = getWallNote(id, viewer.userId);
    if (!note) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ comments: listWallComments(id, viewer.userId) });
  } catch (error) {
    console.error("GET /api/wall/notes/[id]/comments failed", error);
    return NextResponse.json({ error: "Could not load comments." }, { status: 500 });
  }
}

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

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      throw error;
    }

    const text = parseCommentBody(
      body && typeof body === "object" ? (body as { body?: unknown }).body : null,
    );
    if (!text) {
      return NextResponse.json({ error: "body_required" }, { status: 400 });
    }

    const comment = addWallComment({
      noteId: id,
      userId: viewer.user!.id,
      body: text,
    });
    if (note.ownerUserId !== viewer.user!.id) {
      const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
      createNotification({
        userId: note.ownerUserId,
        kind: "wall_comment",
        title: "wall_comment",
        body: preview,
        href: "/wall",
      });
    }
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/wall/notes/[id]/comments failed", error);
    return NextResponse.json({ error: "Could not save this comment." }, { status: 500 });
  }
}
