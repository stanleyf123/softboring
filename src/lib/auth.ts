import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { claimGuestReviews } from "@/db/reviews";
import {
  createSession,
  deleteSession,
  getUserBySessionToken,
  hashSessionToken,
} from "@/db/sessions";
import type { PublicUser } from "@/db/users";
import { GUEST_COOKIE, isGuestId } from "@/lib/guest";

export const SESSION_COOKIE = "softboring_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  return getUserBySessionToken(token);
}

export function issueSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString();
  createSession({
    id: hashSessionToken(token),
    userId,
    expiresAt,
  });
  return token;
}

export async function clearSessionCookieToken() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    deleteSession(hashSessionToken(token));
  }
}

export async function claimGuestReviewsForUser(userId: string) {
  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value;
  if (guestId && isGuestId(guestId)) {
    claimGuestReviews(userId, guestId);
  }
}
