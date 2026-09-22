import { NextResponse } from "next/server";
import { readStreakProtect, spendStreakProtectToken } from "@/db/streak-protect";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "auth_required" }, { status: 401 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return NextResponse.json(readStreakProtect(user.id, userIsSoftPlus(user)));
  } catch (error) {
    console.error("GET /api/streak-protect failed", error);
    return NextResponse.json({ error: "Could not read this pause." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const result = spendStreakProtectToken(user.id, userIsSoftPlus(user));
    if (!result.ok) {
      const status = result.reason === "soft_plus_required" ? 403 : 409;
      return NextResponse.json({ error: result.reason, ...result.view }, { status });
    }
    return NextResponse.json(result.view);
  } catch (error) {
    console.error("POST /api/streak-protect failed", error);
    return NextResponse.json({ error: "Could not keep this pause." }, { status: 500 });
  }
}
