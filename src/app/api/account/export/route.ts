import { NextResponse } from "next/server";
import { listReviewsForOwner } from "@/db/reviews";
import { listSoftReflectionsForUser } from "@/db/soft-reflections";
import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import { getReviewAccess } from "@/lib/review-access";
import { accountDownloadBody, accountDownloadFilename } from "@/lib/review-export";
import { requireUser } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await getReviewAccess();
    const locked = requireUser(access.user);
    if (locked) return locked;

    const reviews = listReviewsForOwner(access.owner);
    const reflections =
      access.softPlus && access.user ? listSoftReflectionsForUser(access.user.id) : [];
    const body = accountDownloadBody(
      reviews,
      access.softPlus,
      new Date().toISOString(),
      FREE_HISTORY_LIMIT,
      reflections,
    );
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${accountDownloadFilename(access.softPlus)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/account/export failed", error);
    return NextResponse.json({ error: "Could not download reviews." }, { status: 500 });
  }
}
