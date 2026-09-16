import { NextResponse } from "next/server";
import { getUserByEmail } from "@/db/users";
import {
  claimGuestReviewsForUser,
  issueSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { AuthError, parseEmail, parseLoginPassword } from "@/lib/auth-input";
import { verifyPassword } from "@/lib/password";
import { enforceAuthRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const emailHint = typeof body.email === "string" ? body.email : null;
    const limited = enforceAuthRateLimit(request, "login", emailHint);
    if (limited) return limited;

    const email = parseEmail(body.email);
    const password = parseLoginPassword(body.password);
    const user = getUserByEmail(email);
    if (
      !user ||
      !user.password_hash ||
      !(await verifyPassword(password, user.password_hash))
    ) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const token = issueSession(user.id);
    await claimGuestReviewsForUser(user.id);

    const response = NextResponse.json({
      user: { email: user.email, createdAt: user.created_at },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "invalid_credentials" ? 401 : 400;
      const code =
        error.code === "invalid_email" ? "invalid_credentials" : error.code;
      return NextResponse.json({ error: code }, { status });
    }
    if (error instanceof SyntaxError) {
      const limited = enforceAuthRateLimit(request, "login");
      if (limited) return limited;
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
