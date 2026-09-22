import { NextResponse } from "next/server";
import { listOwnSoftActivity } from "@/db/soft-activity";
import { getCurrentUser } from "@/lib/auth";
import { clampActivityLimit, SOFT_ACTIVITY_LIMIT } from "@/lib/soft-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const limit = clampActivityLimit(url.searchParams.get("limit") ?? SOFT_ACTIVITY_LIMIT);
    const items = listOwnSoftActivity(user.id, limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/account/activity failed", error);
    return NextResponse.json({ error: "Could not load soft activity." }, { status: 500 });
  }
}
