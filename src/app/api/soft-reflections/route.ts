import { NextResponse } from "next/server";
import {
  currentReflectionWeekKey,
  getSoftReflectionForWeek,
  saveSoftReflectionForWeek,
} from "@/db/soft-reflections";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import {
  emptySoftReflection,
  parseSoftReflectionPayload,
} from "@/lib/soft-reflection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plusRequired() {
  return NextResponse.json({ error: "soft_plus_required", locked: true }, { status: 403 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    const weekKey = currentReflectionWeekKey(user.id);
    const saved = getSoftReflectionForWeek(user.id, weekKey);
    return NextResponse.json({
      weekKey,
      checks: saved?.checks ?? emptySoftReflection(),
      saved: Boolean(saved),
      updatedAt: saved?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("GET /api/soft-reflections failed", error);
    return NextResponse.json(
      { error: "Could not load this week's soft checklist." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    if (!userIsSoftPlus(user)) return plusRequired();

    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const checks = parseSoftReflectionPayload(payload);
    if (!checks) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const weekKey = currentReflectionWeekKey(user.id);
    const saved = saveSoftReflectionForWeek({
      userId: user.id,
      weekKey,
      checks,
    });
    return NextResponse.json({
      weekKey: saved.weekKey,
      checks: saved.checks,
      saved: true,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error("PUT /api/soft-reflections failed", error);
    return NextResponse.json(
      { error: "Could not save this week's soft checklist." },
      { status: 500 },
    );
  }
}
