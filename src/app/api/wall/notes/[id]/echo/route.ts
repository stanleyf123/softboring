import { NextResponse } from "next/server";
import { echoWallNote } from "@/db/wall-echoes";
import { withViewerNoteState } from "@/db/wall-note-view";
import { getWallNote } from "@/db/wall";
import { clientIp } from "@/lib/client-ip";
import { authRateLimitResponse, consumeKeyedRateLimit } from "@/lib/rate-limit";
import { ECHO_IP_MAX, ECHO_USER_MAX, ECHO_WINDOW_MS, parseEchoBody } from "@/lib/soft-echo";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const viewer = await getWallViewer();
    const plus = requireSoftPlus(viewer.user, viewer.softPlus);
    if (plus) return plus;

    const ipLimit = consumeKeyedRateLimit(
      `echo:ip:${clientIp(request) || "unknown"}`,
      ECHO_IP_MAX,
      ECHO_WINDOW_MS,
    );
    if (!ipLimit.ok) return authRateLimitResponse(ipLimit.retryAfterSec);

    const userLimit = consumeKeyedRateLimit(
      `echo:user:${viewer.userId}`,
      ECHO_USER_MAX,
      ECHO_WINDOW_MS,
    );
    if (!userLimit.ok) return authRateLimitResponse(userLimit.retryAfterSec);

    let raw: unknown;
    try {
      const body = (await request.json()) as { body?: unknown };
      raw = body.body;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      throw error;
    }

    if (!parseEchoBody(raw).ok) {
      return NextResponse.json({ error: "invalid_echo" }, { status: 400 });
    }

    try {
      const result = echoWallNote(viewer.user!.id, id, raw as string);
      const note = getWallNote(id, viewer.userId);
      return NextResponse.json({
        ...result,
        note: note ? withViewerNoteState(note, viewer.userId) : null,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "EchoNotFoundError") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error instanceof Error && error.name === "EchoOwnNoteError") {
        return NextResponse.json({ error: "own_note" }, { status: 400 });
      }
      if (error instanceof Error && error.name === "EchoInvalidError") {
        return NextResponse.json({ error: "invalid_echo" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("POST /api/wall/notes/[id]/echo failed", error);
    return NextResponse.json({ error: "Could not leave that echo." }, { status: 500 });
  }
}
