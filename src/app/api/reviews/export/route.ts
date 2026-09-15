import { NextResponse } from "next/server";
import { listReviewsForOwner } from "@/db/reviews";
import { getReviewAccess } from "@/lib/review-access";
import { requireSoftPlus } from "@/lib/wall-access";
import { reviewsToCsv } from "@/lib/plus-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    const locked = requireSoftPlus(access.user, access.softPlus);
    if (locked) return locked;

    const reviews = listReviewsForOwner(access.owner);
    const csv = reviewsToCsv(reviews);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="soft-boring-reviews.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/reviews/export failed", error);
    return NextResponse.json({ error: "Could not export reviews." }, { status: 500 });
  }
}
