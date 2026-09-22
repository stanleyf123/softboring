import { NextResponse } from "next/server";
import {
  countRedeemedInvites,
  getInviteCodeForUser,
  getOrCreateInviteCode,
} from "@/db/invites";
import { routing, type AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { inviteRegisterPath } from "@/lib/invite";
import { isSoftPlusPlan } from "@/lib/plan";
import { publicOrigin } from "@/lib/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asLocale(value: unknown): AppLocale {
  if (typeof value === "string" && routing.locales.includes(value as AppLocale)) {
    return value as AppLocale;
  }
  return routing.defaultLocale;
}

function payload(
  request: Request,
  locale: AppLocale,
  userId: string,
  eligible: boolean,
  code: string | null,
) {
  const origin = publicOrigin(request.url);
  return {
    eligible,
    code,
    link: code ? `${origin}${inviteRegisterPath(locale, code)}` : null,
    redeemedCount: countRedeemedInvites(userId),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const locale = asLocale(new URL(request.url).searchParams.get("locale"));
  const eligible = isSoftPlusPlan(user.plan, user.planStatus);
  const existing = getInviteCodeForUser(user.id);
  return NextResponse.json(payload(request, locale, user.id, eligible, existing?.code ?? null));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  if (!isSoftPlusPlan(user.plan, user.planStatus)) {
    return NextResponse.json({ error: "soft_plus_required" }, { status: 403 });
  }

  let locale: AppLocale = routing.defaultLocale;
  try {
    const body = (await request.json()) as { locale?: unknown };
    locale = asLocale(body.locale);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  try {
    const created = getOrCreateInviteCode(user.id);
    return NextResponse.json(payload(request, locale, user.id, true, created.code));
  } catch (error) {
    console.error("POST /api/account/invite failed", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
