import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "softboring_admin";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export function getAdminToken() {
  return process.env.ADMIN_TOKEN?.trim() || "";
}

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function requestToken(requestHeaders: Headers, cookieValue: string | undefined) {
  const bearer = requestHeaders.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }
  return requestHeaders.get("x-admin-token")?.trim() || cookieValue?.trim() || "";
}

export async function isAdminRequest(request?: Request) {
  const expected = getAdminToken();
  if (!expected) return false;

  const requestHeaders = request ? request.headers : await headers();
  const cookieValue = request
    ? readCookie(request, ADMIN_COOKIE)
    : (await cookies()).get(ADMIN_COOKIE)?.value;
  const provided = requestToken(requestHeaders, cookieValue);
  if (!provided) return false;
  return tokensMatch(provided, expected);
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return rest.join("=");
  }
  return undefined;
}

export async function requireAdmin() {
  const ok = await isAdminRequest();
  if (!ok) {
    redirect("/admin/login");
  }
}
