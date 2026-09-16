import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/db/password-reset";
import { getUserByEmail } from "@/db/users";
import { AuthError, parseEmail } from "@/lib/auth-input";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { publicOrigin } from "@/lib/public-origin";
import { enforceAuthRateLimit } from "@/lib/rate-limit";
import { routing, type AppLocale } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLocale(value: unknown): AppLocale {
  if (value === "en" || value === "zh-tw") {
    return value;
  }
  return routing.defaultLocale;
}

function resetCopy(locale: AppLocale, resetUrl: string) {
  if (locale === "zh-tw") {
    return {
      subject: "重設 Soft Boring Weekly 密碼",
      text: `有人（希望是你）申請重設 Soft Boring Weekly 的密碼。\n\n開啟這個連結（一小時內有效）：\n${resetUrl}\n\n若不是你本人，可以忽略這封信。密碼在你完成重設前不會改變。`,
    };
  }
  return {
    subject: "Reset your Soft Boring Weekly password",
    text: `Someone (hopefully you) asked to reset the password for Soft Boring Weekly.\n\nOpen this link within one hour:\n${resetUrl}\n\nIf this was not you, you can ignore this email. Your password will not change until you finish the reset.`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; locale?: unknown };
    const limited = enforceAuthRateLimit(
      request,
      "forgot-password",
      typeof body.email === "string" ? body.email : null,
    );
    if (limited) return limited;

    const email = parseEmail(body.email);
    const locale = parseLocale(body.locale);
    const user = getUserByEmail(email);
    const emailConfigured = isEmailConfigured();

    if (user) {
      const { token } = createPasswordResetToken(user.id);
      const origin = publicOrigin(request.url);
      const resetUrl = `${origin}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
      if (emailConfigured) {
        const copy = resetCopy(locale, resetUrl);
        await sendEmail({
          to: user.email,
          subject: copy.subject,
          text: copy.text,
        });
      } else {
        console.info(
          `[password-reset] Email is not configured. Reset link for ${user.email}: ${resetUrl}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      emailConfigured,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      const limited = enforceAuthRateLimit(request, "forgot-password");
      if (limited) return limited;
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    console.error("POST /api/auth/forgot-password failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
