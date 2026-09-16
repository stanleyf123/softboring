import { NextResponse } from "next/server";
import { createNotification } from "@/db/notifications";
import {
  addWallComment,
  getWallComment,
  getWallNote,
  listWallComments,
} from "@/db/wall";
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

function previewText(text: string) {
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
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

    const payload = body && typeof body === "object" ? (body as { body?: unknown; parentId?: unknown }) : {};
    const text = parseCommentBody(payload.body);
    if (!text) {
      return NextResponse.json({ error: "body_required" }, { status: 400 });
    }

    const parentId =
      typeof payload.parentId === "string" && payload.parentId.trim()
        ? payload.parentId.trim()
        : null;
    const parent = parentId ? getWallComment(parentId) : undefined;
    if (parentId && (!parent || parent.note_id !== id || parent.parent_id)) {
      return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
    }

    const commenterId = viewer.user!.id;
    try {
      const comment = addWallComment({
        noteId: id,
        userId: commenterId,
        body: text,
        parentId,
      });
      const preview = previewText(text);
      const parentAuthorId = parent?.user_id ?? null;
      if (parentAuthorId && parentAuthorId !== commenterId) {
        createNotification({
          userId: parentAuthorId,
          kind: "wall_reply",
          title: "wall_reply",
          body: preview,
          href: "/wall",
        });
      }
      if (
        note.ownerUserId !== commenterId &&
        note.ownerUserId !== parentAuthorId
      ) {
        createNotification({
          userId: note.ownerUserId,
          kind: parentId ? "wall_reply" : "wall_comment",
          title: parentId ? "wall_reply" : "wall_comment",
          body: preview,
          href: "/wall",
        });
      }
      return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.name === "WallCommentParentError") {
        return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("POST /api/wall/notes/[id]/comments failed", error);
    return NextResponse.json({ error: "Could not save this comment." }, { status: 500 });
  }
}
