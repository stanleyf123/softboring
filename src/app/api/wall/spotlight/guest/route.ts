import { NextResponse } from "next/server";
import { listWallSpotlight } from "@/db/wall-spotlight";
import { toPublicSpotlightCard } from "@/lib/wall-spotlight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One small public pool for the guest card. Soft+ keeps the fuller strip. */
export async function GET() {
  try {
    const items = listWallSpotlight(5).map(toPublicSpotlightCard);
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/wall/spotlight/guest failed", error);
    return NextResponse.json({ error: "Could not load a public note." }, { status: 500 });
  }
}
