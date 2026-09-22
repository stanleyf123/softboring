export const QUIET_DRAFT_STORAGE_KEY = "softboring.wall.quiet-drafts.v1";

const MAX_BODY = 500;

export type QuietDraftRecord = {
  body: string;
  savedAt: string;
};

export type QuietDraftStore = Record<string, QuietDraftRecord>;

/** A new comment is a "note" draft. A reply keeps its own pocket. */
export function quietDraftKey(noteId: string, parentId?: string | null) {
  const note = noteId.trim();
  if (!note) return "";
  const parent = parentId?.trim();
  if (parent) return `reply:${note}:${parent}`;
  return `note:${note}`;
}

export function parseQuietDraftStore(raw: string | null): QuietDraftStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: QuietDraftStore = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!key || !value || typeof value !== "object") continue;
      const body = (value as { body?: unknown }).body;
      const savedAt = (value as { savedAt?: unknown }).savedAt;
      if (typeof body !== "string") continue;
      const trimmed = body.slice(0, MAX_BODY);
      if (!trimmed.trim()) continue;
      store[key] = {
        body: trimmed,
        savedAt: typeof savedAt === "string" ? savedAt : "",
      };
    }
    return store;
  } catch {
    return {};
  }
}

export function withQuietDraft(
  store: QuietDraftStore,
  key: string,
  body: string,
  savedAt: string,
): QuietDraftStore {
  if (!key) return store;
  const trimmed = body.slice(0, MAX_BODY);
  if (!trimmed.trim()) return withoutQuietDraft(store, key);
  return {
    ...store,
    [key]: { body: trimmed, savedAt },
  };
}

export function withoutQuietDraft(store: QuietDraftStore, key: string): QuietDraftStore {
  if (!key || !(key in store)) return store;
  const next = { ...store };
  delete next[key];
  return next;
}

function readStore(): QuietDraftStore {
  if (typeof window === "undefined") return {};
  try {
    return parseQuietDraftStore(window.localStorage.getItem(QUIET_DRAFT_STORAGE_KEY));
  } catch {
    return {};
  }
}

function writeStore(store: QuietDraftStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUIET_DRAFT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or private mode — the words stay in the field for this visit.
  }
}

export function loadQuietDraft(key: string) {
  if (!key) return "";
  return readStore()[key]?.body ?? "";
}

export function saveQuietDraft(key: string, body: string, savedAt = new Date().toISOString()) {
  if (!key) return;
  writeStore(withQuietDraft(readStore(), key, body, savedAt));
}

export function clearQuietDraft(key: string) {
  if (!key) return;
  writeStore(withoutQuietDraft(readStore(), key));
}
