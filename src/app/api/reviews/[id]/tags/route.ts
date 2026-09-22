import { getReviewForOwner, listReviewsForOwner, setReviewSoftTags } from "@/db/reviews";
import { isHistoryIndexUnlocked } from "@/lib/history-access";
import { getReviewAccess } from "@/lib/review-access";
import { normalizeSoftTags } from "@/lib/soft-tags";
import { requireSoftPlus } from "@/lib/wall-access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const access = await getReviewAccess();
    const denied = requireSoftPlus(access.user, access.softPlus);
    if (denied) return denied;
    if (access.owner.kind !== "user") {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || !("tags" in body)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const parsed = normalizeSoftTags((body as { tags?: unknown }).tags);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = getReviewForOwner(access.owner, id);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const all = listReviewsForOwner(access.owner);
    const index = all.findIndex((item) => item.id === id);
    if (index >= 0 && !isHistoryIndexUnlocked(index, access.softPlus)) {
      return NextResponse.json({ error: "locked", locked: true }, { status: 403 });
    }

    const review = setReviewSoftTags(access.owner.userId, id, parsed.tags);
    if (!review) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (error) {
    console.error("PATCH /api/reviews/[id]/tags failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
