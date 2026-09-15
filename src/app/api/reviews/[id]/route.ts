import { getReviewForOwner } from "@/db/reviews";
import { getReviewOwner } from "@/lib/review-owner";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const owner = await getReviewOwner();
    const review = getReviewForOwner(owner, id);
    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (error) {
    console.error("GET /api/reviews/[id] failed", error);
    return NextResponse.json({ error: "Could not load review." }, { status: 500 });
  }
}
