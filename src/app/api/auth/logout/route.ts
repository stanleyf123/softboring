import { NextResponse } from "next/server";
import {
  clearSessionCookieToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookieToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
