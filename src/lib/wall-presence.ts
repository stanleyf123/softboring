/** How far back the wall looks for a gentle neighbor count. */
export const PRESENCE_WINDOW_HOURS = 6;

/** First-party hour stamp only. It is not a user id. */
export const PRESENCE_COOKIE = "sb_wall_hour";

const HOUR_KEY = /^\d{4}-\d{2}-\d{2}T\d{2}$/;

export type PresenceBand = "quiet" | "one" | "few" | "circle" | "many";

export type PresencePublic = {
  windowHours: number;
  neighbors: number;
  band: PresenceBand;
};

export function presenceHourKey(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 13);
}

export function presenceWindowStart(now: Date, hours = PRESENCE_WINDOW_HOURS) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

export function presenceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: PRESENCE_WINDOW_HOURS * 60 * 60,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

/** One browser counts at most once per UTC hour. A missing cookie still counts. */
export function shouldCountPresenceHit(cookieHour: string | null | undefined, hourKey: string) {
  if (!HOUR_KEY.test(hourKey)) return false;
  if (typeof cookieHour === "string" && cookieHour === hourKey) return false;
  return true;
}

export function sanitizePresenceCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(999, Math.floor(value));
}

export function presenceBand(count: number): PresenceBand {
  const safe = sanitizePresenceCount(count);
  if (safe <= 0) return "quiet";
  if (safe === 1) return "one";
  if (safe <= 4) return "few";
  if (safe <= 12) return "circle";
  return "many";
}

/**
 * Page hits are the usual signal. If nobody has been counted yet,
 * recent thanks and echoes (a sum, not a list of people) can stand in.
 */
export function neighborPresenceCount(input: { readers: number; warmth: number }) {
  const readers = sanitizePresenceCount(input.readers);
  const warmth = sanitizePresenceCount(input.warmth);
  return readers > 0 ? readers : warmth;
}

/** Public shape: a window, a count, and a soft band. No ids, names, or notes. */
export function presencePublicView(input: { readers: number; warmth: number }): PresencePublic {
  const neighbors = neighborPresenceCount(input);
  return {
    windowHours: PRESENCE_WINDOW_HOURS,
    neighbors,
    band: presenceBand(neighbors),
  };
}

let pingClaimed = false;

/** One wall visit per page load, even if the strip remounts. */
export function claimPresencePing() {
  if (pingClaimed) return false;
  pingClaimed = true;
  return true;
}

export function resetPresencePingClaim() {
  pingClaimed = false;
}
