import { NextResponse } from "next/server";
import {
  addGratitude,
  countGratitudes,
  deleteGratitude,
  GRATITUDE_MAX,
  pickRandomGratitude,
  parseGratitudeBody,
} from "@/db/soft-gratitudes";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plusRequired() {
  return NextResponse.json({ error: "soft_plus_required", locked: true }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json({ error: "auth_required" }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!userIsSoftPlus(user)) return plusRequired();

    const draw = new URL(request.url).searchParams.get("draw") === "1";
    const count = countGratitudes(user.id);
    return NextResponse.json({
      count,
      maxLength: GRATITUDE_MAX,
      drawn: draw ? pickRandomGratitude(user.id) : null,
    });
  } catch (error) {
    console.error("GET /api/gratitude-jar failed", error);
    return NextResponse.json({ error: "Could not open the gratitude jar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!userIsSoftPlus(user)) return plusRequired();

    let rawBody: unknown = "";
    try {
      const payload = (await request.json()) as { body?: unknown };
      rawBody = payload.body;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (typeof rawBody !== "string" || !parseGratitudeBody(rawBody)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const result = addGratitude(user.id, rawBody);
    if (!result.ok) {
      if (result.reason === "full") {
        return NextResponse.json({ error: "jar_full" }, { status: 409 });
      }
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    return NextResponse.json({
      gratitude: result.gratitude,
      count: result.count,
      maxLength: GRATITUDE_MAX,
    });
  } catch (error) {
    console.error("POST /api/gratitude-jar failed", error);
    return NextResponse.json({ error: "Could not save that gratitude." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!userIsSoftPlus(user)) return plusRequired();

    let id = "";
    try {
      const payload = (await request.json()) as { id?: unknown };
      id = typeof payload.id === "string" ? payload.id.trim() : "";
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const removed = deleteGratitude(user.id, id);
    if (!removed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      removed: true,
      count: countGratitudes(user.id),
      maxLength: GRATITUDE_MAX,
    });
  } catch (error) {
    console.error("DELETE /api/gratitude-jar failed", error);
    return NextResponse.json({ error: "Could not release that gratitude." }, { status: 500 });
  }
}
