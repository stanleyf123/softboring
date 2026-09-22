import { NextResponse } from "next/server";
import { listReviewsForOwner } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { buildSoftMonthSnapshot } from "@/lib/soft-month";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const settings = ensureUserSettings(user.id);
    const snapshot = buildSoftMonthSnapshot(
      listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" }),
      {
        timeZone: settings.timezone,
        softPlus: userIsSoftPlus(user),
      },
    );
    return NextResponse.json(snapshot, {
      headers: {
        "Content-Disposition": 'attachment; filename="soft-month.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/account/snapshot failed", error);
    return NextResponse.json({ error: "Could not build this month." }, { status: 500 });
  }
}
