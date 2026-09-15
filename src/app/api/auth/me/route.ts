import { NextResponse } from "next/server";
import { countReviewsForUser } from "@/db/reviews";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        email: user.email,
        createdAt: user.createdAt,
        reviewCount: countReviewsForUser(user.id),
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
