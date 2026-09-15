import { NextResponse } from "next/server";
import {
  consumePasswordResetToken,
  deleteSessionsForUser,
  getValidPasswordReset,
  updateUserPasswordHash,
} from "@/db/password-reset";
import { AuthError, parseNewPassword } from "@/lib/auth-input";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length < 32) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    const password = parseNewPassword(body.password);
    const reset = getValidPasswordReset(token);
    if (!reset) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    updateUserPasswordHash(reset.user_id, passwordHash);
    consumePasswordResetToken(reset.token_hash);
    deleteSessionsForUser(reset.user_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("POST /api/auth/reset-password failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
