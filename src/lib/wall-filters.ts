export type WallFilterNote = {
  feeling?: number | null;
  excerpt?: string;
  summary?: string;
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

export const EMPTY_WALL_FILTERS: WallDiscoveryFilters = {
  query: "",
  feelingMin: null,
  feelingMax: null,
  hideDemo: false,
};

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

/** Soft+ discovery: feeling range, nickname / excerpt search, optional demo mute. */
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

  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    note.ownerNickname,
    note.ownerFallback,
    note.excerpt,
    note.summary,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n")
    .toLowerCase();

  return haystack.includes(needle);
}

export function filterWallNotes<T extends WallFilterNote>(
  notes: T[],
  filters: WallDiscoveryFilters,
): T[] {
  if (!wallFiltersActive(filters)) return notes;
  return notes.filter((note) => wallNoteMatchesFilters(note, filters));
}
