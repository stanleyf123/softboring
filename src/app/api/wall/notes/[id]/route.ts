import { NextResponse } from "next/server";
import { attachEchoesToDetail } from "@/db/wall-echoes";
import { attachBookmarkToDetail } from "@/db/wall-bookmarks";
import { attachFlagToDetail } from "@/db/wall-flags";
import { attachThanksToDetail } from "@/db/wall-thanks";
import {
  deleteWallNoteForUser,
  getWallNote,
  pinWallNoteForUser,
  updateWallNotePosition,
} from "@/db/wall";
import { getWallViewer, parsePosition, requireSoftPlus, requireUser } from "@/lib/wall-access";

function attachNoteExtras(
  note: NonNullable<ReturnType<typeof getWallNote>>,
  userId: string | null,
) {
  return attachEchoesToDetail(
    attachThanksToDetail(
      attachFlagToDetail(attachBookmarkToDetail(note, userId), userId),
      userId,
    ),
    userId,
  );
}

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
    return NextResponse.json({ note: attachNoteExtras(note, viewer.userId) });
  } catch (error) {
    console.error("GET /api/wall/notes/[id] failed", error);
    return NextResponse.json({ error: "Could not load this note." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      throw error;
    }

    const pinValue =
      body && typeof body === "object" && "pin" in body
        ? (body as { pin?: unknown }).pin
        : undefined;
    if (typeof pinValue === "boolean") {
      const changes = pinWallNoteForUser(id, viewer.user!.id, pinValue);
      if (!changes) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      const note = getWallNote(id, viewer.userId);
      return NextResponse.json({
        note: note ? attachNoteExtras(note, viewer.userId) : note,
      });
    }

    const position = parsePosition(body);
    if (!position) {
      return NextResponse.json({ error: "invalid_position" }, { status: 400 });
    }

    const changes = updateWallNotePosition({ id, ...position });
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const note = getWallNote(id, viewer.userId);
    return NextResponse.json({
      note: note ? attachNoteExtras(note, viewer.userId) : note,
    });
  } catch (error) {
    console.error("PATCH /api/wall/notes/[id] failed", error);
    return NextResponse.json({ error: "Could not move this note." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const unauthorized = requireUser(viewer.user);
    if (unauthorized) return unauthorized;

    const changes = deleteWallNoteForUser(id, viewer.user!.id);
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wall/notes/[id] failed", error);
    return NextResponse.json({ error: "Could not unshare this note." }, { status: 500 });
  }
}
