import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import type { PublicUser } from "@/db/users";

export async function getWallViewer() {
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);
  return {
    user,
    userId: user?.id ?? null,
    signedIn: Boolean(user),
    softPlus,
  };
}

export function requireUser(user: PublicUser | null) {
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  return null;
}

export function requireSoftPlus(user: PublicUser | null, softPlus: boolean) {
  const auth = requireUser(user);
  if (auth) return auth;
  if (!softPlus) {
    return NextResponse.json(
      { error: "soft_plus_required", locked: true },
      { status: 403 },
    );
  }
  return null;
}

export function parseCommentBody(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.trim().slice(0, 500);
  return body.length > 0 ? body : null;
}

export function parsePosition(body: unknown): { x: number; y: number; z?: number } | null {
  if (!body || typeof body !== "object") return null;
  const input = body as { x?: unknown; y?: unknown; z?: unknown };
  if (typeof input.x !== "number" || typeof input.y !== "number") return null;
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return null;
  const next: { x: number; y: number; z?: number } = { x: input.x, y: input.y };
  if (input.z != null) {
    if (typeof input.z !== "number" || !Number.isFinite(input.z)) return null;
    next.z = input.z;
  }
  return next;
}
