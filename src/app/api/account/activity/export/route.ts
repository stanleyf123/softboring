import { NextResponse } from "next/server";
import { listOwnSoftActivity } from "@/db/soft-activity";
import {
  ACTIVITY_EXPORT_FILENAME,
  activityExportBody,
} from "@/lib/activity-export";
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

    const body = activityExportBody(listOwnSoftActivity(user.id), new Date().toISOString());
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ACTIVITY_EXPORT_FILENAME}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/account/activity/export failed", error);
    return NextResponse.json({ error: "Could not download soft activity." }, { status: 500 });
  }
}
