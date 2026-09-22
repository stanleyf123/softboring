import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applyPresenceVisit } from "@/db/wall-presence";
import { getDb } from "@/db/client";
import { clientIp } from "@/lib/client-ip";
import { consumeKeyedRateLimit } from "@/lib/rate-limit";
import { PRESENCE_COOKIE, presenceCookieOptions } from "@/lib/wall-presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function snapshot(count: boolean, cookieHour: string | null) {
  const { view, setCookieHour } = applyPresenceVisit(getDb(), new Date(), {
    cookieHour,
    count,
  });
  const response = NextResponse.json(view);
  if (setCookieHour) {
    response.cookies.set(PRESENCE_COOKIE, setCookieHour, presenceCookieOptions());
  }
  return response;
}

/** Read the aggregate. Does not add a hit. */
export async function GET() {
  try {
    const store = await cookies();
    return snapshot(false, store.get(PRESENCE_COOKIE)?.value ?? null);
  } catch (error) {
    console.error("GET /api/wall/presence failed", error);
    return NextResponse.json({ error: "Could not read the room." }, { status: 500 });
  }
}

/**
 * Optional hit plus the aggregate. The body may ask to count; the hour
 * cookie still refuses a second hit from the same browser in the same hour.
 * The JSON is only windowHours, neighbors, and band.
 */
export async function POST(request: Request) {
  try {
    const store = await cookies();
    let count = false;
    try {
      const body = (await request.json()) as { count?: unknown };
      count = body?.count === true;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    if (count) {
      const limit = consumeKeyedRateLimit(
        `wall-presence:${clientIp(request)}`,
        30,
        10 * 60 * 1000,
      );
      if (!limit.ok) count = false;
    }
    return snapshot(count, store.get(PRESENCE_COOKIE)?.value ?? null);
  } catch (error) {
    console.error("POST /api/wall/presence failed", error);
    return NextResponse.json({ error: "Could not read the room." }, { status: 500 });
  }
}
