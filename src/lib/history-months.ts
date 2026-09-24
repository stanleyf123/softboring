import { calendarInTimeZone, isIanaTimeZone } from "@/lib/timezone";

/** A week that did not bring a usable timestamp. */
export const HISTORY_UNDATED_KEY = "undated";

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export type HistoryMonthStamp = {
  createdAt?: string | null;
};

export type HistoryMonthGroup<T> = {
  key: string;
  year: number | null;
  month: number | null;
  items: T[];
};

/**
 * The clock used to place a week in a month.
 * An account timezone wins. Otherwise the browser's zone. Otherwise UTC.
 * An unreadable zone stays UTC, so a guest is not silently moved to Taipei.
 */
export function resolvedHistoryZone(explicit?: string | null, browserZone?: string | null) {
  const chosen = (explicit ?? "").trim() || (browserZone ?? "").trim();
  if (!chosen || !isIanaTimeZone(chosen)) return "UTC";
  return chosen;
}

export function historyMonthKey(iso: string | null | undefined, timeZone: string) {
  if (typeof iso !== "string" || !iso.trim()) return HISTORY_UNDATED_KEY;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return HISTORY_UNDATED_KEY;
  const zone = resolvedHistoryZone(timeZone, null);
  const { year, month } = calendarInTimeZone(date, zone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseHistoryMonthKey(key: string): { year: number | null; month: number | null } {
  const match = MONTH_KEY.exec(key);
  if (!match) return { year: null, month: null };
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: null, month: null };
  return { year, month };
}

/**
 * Group weeks by calendar month, keeping the order they arrived.
 * Undated weeks sit in one group at the end.
 */
export function groupHistoryByMonth<T extends HistoryMonthStamp>(
  items: readonly T[],
  timeZone: string,
): HistoryMonthGroup<T>[] {
  const zone = resolvedHistoryZone(timeZone, null);
  const groups: HistoryMonthGroup<T>[] = [];
  const index = new Map<string, HistoryMonthGroup<T>>();

  for (const item of items) {
    const key = historyMonthKey(item.createdAt, zone);
    let group = index.get(key);
    if (!group) {
      const parsed = parseHistoryMonthKey(key);
      group = { key, year: parsed.year, month: parsed.month, items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  const dated = groups.filter((group) => group.key !== HISTORY_UNDATED_KEY);
  const undated = groups.filter((group) => group.key === HISTORY_UNDATED_KEY);
  return [...dated, ...undated];
}
