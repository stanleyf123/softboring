import { NextResponse } from "next/server";
import { getWallNoteIncludingHidden } from "@/db/wall";
import { clientIp } from "@/lib/client-ip";
import { wallOwnerNickname } from "@/lib/nickname";
import { authRateLimitResponse, consumeKeyedRateLimit } from "@/lib/rate-limit";
import { getWallViewer } from "@/lib/wall-access";
import { wallQuoteColor, wallQuoteText } from "@/lib/wall-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_WINDOW_MS = 60 * 60 * 1000;
const QUOTE_IP_MAX = 24;
const QUOTE_USER_MAX = 40;

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const ipLimit = consumeKeyedRateLimit(
      `quote:ip:${clientIp(request) || "unknown"}`,
      QUOTE_IP_MAX,
      QUOTE_WINDOW_MS,
    );
    if (!ipLimit.ok) return authRateLimitResponse(ipLimit.retryAfterSec);

    const viewer = await getWallViewer();
    if (viewer.userId) {
      const userLimit = consumeKeyedRateLimit(
        `quote:user:${viewer.userId}`,
        QUOTE_USER_MAX,
        QUOTE_WINDOW_MS,
      );
      if (!userLimit.ok) return authRateLimitResponse(userLimit.retryAfterSec);
    }

    const { id } = await context.params;
    const row = getWallNoteIncludingHidden(id.trim());
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const owns = viewer.userId != null && viewer.userId === row.user_id;
    if (row.hidden && !owns) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      quote: {
        noteId: row.id,
        quote: wallQuoteText(row.summary, row.energy),
        author: wallOwnerNickname(row.owner_nickname, row.owner_email, {
          allowEmailFallback: false,
        }),
        color: wallQuoteColor(row.color),
      },
    });
  } catch (error) {
    console.error("GET /api/wall/notes/[id]/quote failed", error);
    return NextResponse.json({ error: "Could not prepare that quote." }, { status: 500 });
  }
}
