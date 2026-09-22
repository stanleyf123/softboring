/** Visit-only Soft Wall search. It only reads fields already on the note. */

export const SOFT_WALL_SEARCH_MAX = 80;

export type SoftSearchNote = {
  ownerNickname?: string | null;
  ownerFallback?: string | null;
  excerpt?: string | null;
  summary?: string | null;
};

export function normalizeSoftSearch(query: string) {
  return query.trim().toLocaleLowerCase().slice(0, SOFT_WALL_SEARCH_MAX);
}

/** Nickname, and note words only when those words are already on the client note. */
export function noteMatchesSoftSearch(note: SoftSearchNote, query: string) {
  const needle = normalizeSoftSearch(query);
  if (!needle) return true;
  const haystack = [note.ownerNickname, note.ownerFallback, note.excerpt, note.summary]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .toLocaleLowerCase();
  return haystack.includes(needle);
}

export function filterNotesBySoftSearch<T extends SoftSearchNote>(notes: readonly T[], query: string): T[] {
  const needle = normalizeSoftSearch(query);
  if (!needle) return [...notes];
  return notes.filter((note) => noteMatchesSoftSearch(note, needle));
}
