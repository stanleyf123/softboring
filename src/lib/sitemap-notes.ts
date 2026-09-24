import { getDb } from "@/db/client";
import type { SitemapNoteInput } from "@/lib/sitemap-build";

const NOTE_LIMIT = 2000;

type Statement = {
  all: () => unknown[];
  get: () => unknown;
};

type SqlDb = {
  prepare: (sql: string) => Statement;
};

function columnSet(db: SqlDb) {
  const rows = db.prepare(`PRAGMA table_info(wall_notes)`).all();
  const names = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === "object" && "name" in row && typeof row.name === "string") {
      names.add(row.name);
    }
  }
  return names;
}

/**
 * Public Soft Wall notes for the sitemap.
 * A missing table or a short schema returns an empty list. Caller catches other failures.
 * The select list is id and dates only — never email, user id, or review id.
 */
export function loadSitemapNotesFromDatabase(db: SqlDb): SitemapNoteInput[] {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_notes'`)
    .get() as { name?: string } | undefined;
  if (!table) return [];

  const columns = columnSet(db);
  if (!columns.has("id")) return [];

  const created = columns.has("created_at") ? "created_at" : "NULL";
  const updated = columns.has("updated_at") ? "updated_at" : "NULL";
  const hidden = columns.has("hidden") ? "hidden" : "0";
  const where = columns.has("hidden") ? "WHERE hidden IS NULL OR hidden = 0" : "";
  const order = columns.has("updated_at")
    ? "ORDER BY datetime(updated_at) DESC"
    : "ORDER BY rowid DESC";

  const rows = db
    .prepare(
      `SELECT id AS id, ${created} AS created_at, ${updated} AS updated_at, ${hidden} AS hidden
       FROM wall_notes
       ${where}
       ${order}
       LIMIT ${NOTE_LIMIT}`,
    )
    .all();

  const notes: SitemapNoteInput[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as SitemapNoteInput;
    notes.push({
      id: record.id,
      hidden: record.hidden,
      created_at: record.created_at,
      updated_at: record.updated_at,
    });
  }
  return notes;
}

export function loadSitemapNotesFromDb() {
  return loadSitemapNotesFromDatabase(getDb());
}

/** Empty, missing, or locked database data becomes an empty note list. */
export function readOptionalSitemapNotes(load: () => unknown = loadSitemapNotesFromDb): SitemapNoteInput[] {
  try {
    const notes = load();
    if (!Array.isArray(notes)) return [];
    return notes.filter((note) => note !== null && typeof note === "object") as SitemapNoteInput[];
  } catch (error) {
    console.error("sitemap notes skipped", error);
    return [];
  }
}
