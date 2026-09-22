import { NextResponse } from "next/server";
import { redeemGiftCode } from "@/db/gift-codes";
import { getCurrentUser } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { consumeAuthRateLimit, authRateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "signin_required" }, { status: 401 });
  }

  // Soft reuse of auth windows: keep gift guessing quiet (ip + account).
  const limited = consumeAuthRateLimit("forgot-password", clientIp(request), user.email);
  if (!limited.ok) {
    return authRateLimitResponse(limited.retryAfterSec);
  }

  let body: { code?: unknown } = {};
  try {
    body = (await request.json()) as { code?: unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = redeemGiftCode({ code: String(body.code ?? ""), userId: user.id });
  if (!result.ok) {
    const status =
      result.error === "already_plus"
        ? 409
        : result.error === "already_used" || result.error === "not_found"
          ? 404
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    permanent: result.permanent,
    days: result.days,
    expiresAt: result.expiresAt,
    user: {
      id: result.user.id,
      email: result.user.email,
      plan: result.user.plan,
      planStatus: result.user.planStatus,
      planExpiresAt: result.user.planExpiresAt,
    },
  });
}
