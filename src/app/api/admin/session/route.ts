import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  getAdminToken,
} from "@/lib/admin";
import { publicAbsoluteUrl, safeAdminPath } from "@/lib/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readToken(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { token?: string; return_to?: string };
    return {
      token: String(body.token ?? "").trim(),
      returnTo: String(body.return_to ?? "/admin"),
    };
  }
  const form = await request.formData();
  return {
    token: String(form.get("token") ?? "").trim(),
    returnTo: String(form.get("return_to") ?? "/admin"),
  };
}

export async function POST(request: Request) {
  const expected = getAdminToken();
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN is not configured on the server." },
      { status: 503 },
    );
  }

  const { token, returnTo } = await readToken(request);
  const destination = publicAbsoluteUrl(safeAdminPath(returnTo), request.url);
  if (!token || !tokensMatch(token, expected)) {
    const failure = publicAbsoluteUrl("/admin/login", request.url);
    failure.searchParams.set("return_to", safeAdminPath(returnTo));
    failure.searchParams.set("error", "1");
    return NextResponse.redirect(failure, { status: 303 });
  }

  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(ADMIN_COOKIE, expected, adminCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
