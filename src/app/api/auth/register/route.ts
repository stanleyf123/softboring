import { NextResponse } from "next/server";
import { createUser } from "@/db/users";
import {
  claimGuestReviewsForUser,
  issueSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { AuthError, parseEmail, parseNewPassword } from "@/lib/auth-input";
import { hashPassword } from "@/lib/password";
import { enforceAuthRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const limited = enforceAuthRateLimit(
      request,
      "register",
      typeof body.email === "string" ? body.email : null,
    );
    if (limited) return limited;

    const email = parseEmail(body.email);
    const password = parseNewPassword(body.password);
    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash);
    const token = issueSession(user.id);
    await claimGuestReviewsForUser(user.id);

    const response = NextResponse.json({
      user: { email: user.email, createdAt: user.createdAt },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof Error && error.name === "EmailTakenError") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    if (error instanceof SyntaxError) {
      const limited = enforceAuthRateLimit(request, "register");
      if (limited) return limited;
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("POST /api/auth/register failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
