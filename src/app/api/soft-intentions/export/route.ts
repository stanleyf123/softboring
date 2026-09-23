import { NextResponse } from "next/server";
import { currentWeekKey, listSoftIntentionsForUser } from "@/db/soft-intentions";
import {
  INTENTION_EXPORT_FILENAME,
  intentionExportBody,
} from "@/lib/soft-intention-export";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { requireSoftPlus } from "@/lib/wall-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const denied = requireSoftPlus(user, userIsSoftPlus(user));
    if (denied) return denied;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = intentionExportBody(
      listSoftIntentionsForUser(user.id),
      currentWeekKey(),
      new Date().toISOString(),
    );
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${INTENTION_EXPORT_FILENAME}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/soft-intentions/export failed", error);
    return NextResponse.json(
      { error: "Could not download soft intentions." },
      { status: 500 },
    );
  }
}
