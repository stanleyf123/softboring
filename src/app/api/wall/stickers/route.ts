import { NextResponse } from "next/server";
import {
  countPlacedStickersThisMonth,
  inventoryTotal,
  listInventory,
  listStickers,
} from "@/db/stickers";
import { formatOneTimeCents, isStripeConfigured } from "@/lib/stripe";
import { getWallViewer } from "@/lib/wall-access";
import { STICKER_PACK_PRICE_CENTS } from "@/lib/wall-canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await getWallViewer();
    const inventory = viewer.userId ? listInventory(viewer.userId) : {};
    const stickers = listStickers().map((sticker) => ({
      ...sticker,
      formatted: formatOneTimeCents(sticker.priceCents),
    }));
    return NextResponse.json({
      stickers,
      inventory,
      inventoryCount: inventoryTotal(inventory),
      placedThisMonth: viewer.userId
        ? countPlacedStickersThisMonth(viewer.userId)
        : 0,
      pack: {
        slug: "pack",
        priceCents: STICKER_PACK_PRICE_CENTS,
        formatted: formatOneTimeCents(STICKER_PACK_PRICE_CENTS),
      },
      stripeConfigured: isStripeConfigured(),
      softPlus: viewer.softPlus,
    });
  } catch (error) {
    console.error("GET /api/wall/stickers failed", error);
    return NextResponse.json({ error: "Could not load stickers." }, { status: 500 });
  }
}
