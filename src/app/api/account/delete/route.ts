import { NextResponse } from "next/server";
import { deleteUser } from "@/db/users";
import { leaveConfirmationMatches } from "@/lib/account-leave";
import {
  clearSessionCookieToken,
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { phrase?: unknown; email?: unknown };
    try {
      body = (await request.json()) as { phrase?: unknown; email?: unknown };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      throw error;
    }

    const match = leaveConfirmationMatches({
      phrase: body.phrase,
      email: body.email,
      accountEmail: user.email,
    });
    if (match === "phrase") {
      return NextResponse.json({ error: "phrase_mismatch" }, { status: 400 });
    }
    if (match === "email") {
      return NextResponse.json({ error: "email_mismatch" }, { status: 400 });
    }

    const changes = deleteUser(user.id);
    if (!changes) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await clearSessionCookieToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("POST /api/account/delete failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
