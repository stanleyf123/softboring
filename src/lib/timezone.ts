export const DEFAULT_TIMEZONE = "Asia/Taipei";

export const TIMEZONE_CHOICES = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Shanghai",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export type TimezoneChoice = (typeof TIMEZONE_CHOICES)[number];

export function isTimezoneChoice(value: string): value is TimezoneChoice {
  return (TIMEZONE_CHOICES as readonly string[]).includes(value);
}

export function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: string | null | undefined) {
  if (typeof value !== "string") return DEFAULT_TIMEZONE;
  const trimmed = value.trim();
  if (!trimmed || !isValidTimeZone(trimmed)) return DEFAULT_TIMEZONE;
  return trimmed;
}

export function parseTimezoneChoice(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return isTimezoneChoice(trimmed) ? trimmed : undefined;
}

export function zonedYearMonth(date: Date, timeZone: string) {
  const zone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}
