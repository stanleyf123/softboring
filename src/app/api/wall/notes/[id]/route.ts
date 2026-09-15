import { NextResponse } from "next/server";
import {
  deleteWallNoteForUser,
  getWallNote,
  updateWallNotePosition,
} from "@/db/wall";
import { getWallViewer, parsePosition, requireSoftPlus, requireUser } from "@/lib/wall-access";

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
    return NextResponse.json({ note });
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

    const position = parsePosition(body);
    if (!position) {
      return NextResponse.json({ error: "invalid_position" }, { status: 400 });
    }

    const changes = updateWallNotePosition({ id, ...position });
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const note = getWallNote(id, viewer.userId);
    return NextResponse.json({ note });
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
