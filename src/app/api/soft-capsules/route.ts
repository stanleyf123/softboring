import { NextResponse } from "next/server";
import {
  CAPSULE_CAP,
  deleteCapsule,
  listPublicCapsules,
  sealCapsule,
} from "@/db/soft-capsules";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { CAPSULE_MAX, capsuleDateBounds } from "@/lib/soft-capsule";
import { userIsSoftPlus } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function plusRequired() {
  return NextResponse.json({ error: "soft_plus_required", locked: true }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json({ error: "auth_required" }, { status: 401 });
}

function shelfPayload(userId: string, now = new Date()) {
  const timeZone = ensureUserSettings(userId).timezone;
  const bounds = capsuleDateBounds(now, timeZone);
  const capsules = listPublicCapsules(userId, now);
  return {
    capsules,
    count: capsules.length,
    cap: CAPSULE_CAP,
    maxLength: CAPSULE_MAX,
    ...bounds,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!userIsSoftPlus(user)) return plusRequired();
    return NextResponse.json(shelfPayload(user.id));
  } catch (error) {
    console.error("GET /api/soft-capsules failed", error);
    return NextResponse.json({ error: "Could not open the capsule shelf." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!userIsSoftPlus(user)) return plusRequired();

    let rawBody: unknown = "";
    let unlockOn: unknown = "";
    try {
      const payload = (await request.json()) as { body?: unknown; unlockOn?: unknown };
      rawBody = payload.body;
      unlockOn = payload.unlockOn;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const now = new Date();
    const result = sealCapsule(user.id, rawBody, unlockOn, now);
    if (!result.ok) {
      if (result.reason === "full") {
        return NextResponse.json({ error: "capsule_full" }, { status: 409 });
      }
      if (result.reason === "date") {
        return NextResponse.json({ error: "invalid_date" }, { status: 400 });
      }
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    return NextResponse.json({
      capsule: result.capsule,
      ...shelfPayload(user.id, now),
    });
  } catch (error) {
    console.error("POST /api/soft-capsules failed", error);
    return NextResponse.json({ error: "Could not seal that note." }, { status: 500 });
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

    const removed = deleteCapsule(user.id, id);
    if (!removed) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      removed: true,
      ...shelfPayload(user.id),
    });
  } catch (error) {
    console.error("DELETE /api/soft-capsules failed", error);
    return NextResponse.json({ error: "Could not let that capsule go." }, { status: 500 });
  }
}
