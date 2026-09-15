import { cookies } from "next/headers";

/** HttpOnly guest cookie for anonymous reviews. Logged-in reviews use user_id. */
export const GUEST_COOKIE = "softboring_guest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export function isGuestId(value: string) {
  return UUID_RE.test(value);
}

export function guestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export async function getOrCreateGuestId() {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing && isGuestId(existing)) {
    return existing;
  }

  const guestId = crypto.randomUUID();
  store.set(GUEST_COOKIE, guestId, guestCookieOptions());
  return guestId;
}
