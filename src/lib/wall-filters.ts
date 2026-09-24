export type WallFilterNote = {
  feeling?: number | null;
  excerpt?: string;
  summary?: string;
  /** Words already on a readable note. Absent on locked teasers. */
  energy?: string | null;
  drain?: string | null;
  lessOf?: string | null;
  priorities?: string | null;
  ownerNickname?: string | null;
  ownerFallback?: string | null;
  ownerIsDemo?: boolean;
};

export type WallDiscoveryFilters = {
  query: string;
  feelingMin: number | null;
  feelingMax: number | null;
  /** Soft+: hide @softboring.demo / is_demo notes so real neighbors feel clearer. */
  hideDemo: boolean;
};

/** Soft+ wall sort — complements filters; corkboard x/y stay put, stacking follows rank. */
export type WallSortMode = "newest" | "most_praised" | "pinned_first";

export type WallSortNote = {
  id?: string;
  createdAt?: string;
  praiseCount?: number;
  pinned?: boolean;
};

export const EMPTY_WALL_FILTERS: WallDiscoveryFilters = {
  query: "",
  feelingMin: null,
  feelingMax: null,
  hideDemo: false,
};

export const DEFAULT_WALL_SORT: WallSortMode = "newest";

export const WALL_SORT_MODES: WallSortMode[] = [
  "newest",
  "most_praised",
  "pinned_first",
];

export function isWallSortMode(value: unknown): value is WallSortMode {
  return value === "newest" || value === "most_praised" || value === "pinned_first";
}

export const WALL_HIDE_DEMO_STORAGE_KEY = "softboring.wall.hideDemo.v1";

export function readHideDemoPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WALL_HIDE_DEMO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHideDemoPreference(hide: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALL_HIDE_DEMO_STORAGE_KEY, hide ? "1" : "0");
  } catch {
    // Ignore quota / private mode.
  }
}

export function normalizeFeelingBound(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export function wallFiltersActive(filters: WallDiscoveryFilters) {
  return Boolean(
    filters.query.trim() ||
      filters.feelingMin != null ||
      filters.feelingMax != null ||
      filters.hideDemo,
  );
}

/** Same visit cap as guest Soft Wall search. Kept local so this file stays import-free. */
const PLUS_SEARCH_MAX = 80;

function normalizePlusSearch(query: string) {
  return query.trim().toLocaleLowerCase().slice(0, PLUS_SEARCH_MAX);
}

const NOTE_WORD_FIELDS = [
  "ownerNickname",
  "ownerFallback",
  "excerpt",
  "summary",
  "energy",
  "drain",
  "lessOf",
  "priorities",
] as const;

/** Soft+ discovery: feeling range, nickname and words already on the note, optional demo mute. */
export function wallNoteMatchesFilters(
  note: WallFilterNote,
  filters: WallDiscoveryFilters,
) {
  if (filters.hideDemo && note.ownerIsDemo) return false;

  const min = filters.feelingMin;
  const max = filters.feelingMax;
  if (min != null || max != null) {
    if (typeof note.feeling !== "number") return false;
    if (min != null && note.feeling < min) return false;
    if (max != null && note.feeling > max) return false;
  }

  const needle = normalizePlusSearch(filters.query);
  if (!needle) return true;

  const haystack = NOTE_WORD_FIELDS.map((field) => note[field])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .toLocaleLowerCase();

  return haystack.includes(needle);
}

export function filterWallNotes<T extends WallFilterNote>(
  notes: T[],
  filters: WallDiscoveryFilters,
): T[] {
  if (!wallFiltersActive(filters)) return notes;
  return notes.filter((note) => wallNoteMatchesFilters(note, filters));
}

function noteCreatedMs(note: WallSortNote) {
  const ms = Date.parse(note.createdAt ?? "");
  return Number.isNaN(ms) ? 0 : ms;
}

function noteIdKey(note: WallSortNote) {
  return note.id ?? "";
}

/** Soft+ discovery sort. Does not move corkboard coordinates. */
export function sortWallNotes<T extends WallSortNote>(
  notes: T[],
  sort: WallSortMode,
): T[] {
  const copy = [...notes];
  switch (sort) {
    case "most_praised":
      return copy.sort(
        (a, b) =>
          (b.praiseCount ?? 0) - (a.praiseCount ?? 0) ||
          noteCreatedMs(b) - noteCreatedMs(a) ||
          noteIdKey(a).localeCompare(noteIdKey(b)),
      );
    case "pinned_first":
      return copy.sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          (b.praiseCount ?? 0) - (a.praiseCount ?? 0) ||
          noteCreatedMs(b) - noteCreatedMs(a) ||
          noteIdKey(a).localeCompare(noteIdKey(b)),
      );
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          noteCreatedMs(b) - noteCreatedMs(a) ||
          noteIdKey(a).localeCompare(noteIdKey(b)),
      );
  }
}

/** Raise sorted Soft+ notes forward so the chosen order reads on the corkboard. */
export function withSortStacking<T extends { z: number }>(notes: T[]): T[] {
  const total = notes.length;
  return notes.map((note, index) => ({
    ...note,
    z: Math.max(1, total - index),
  }));
}
