import { getDb } from "./client";
import {
  COLLECTION_CAP,
  collectionMembershipAllowed,
  collectionNameTakenExcept,
  parseCollectionName,
  type WallCollection,
} from "@/lib/wall-collections";

export type { WallCollection };
export { COLLECTION_CAP, parseCollectionName };

type CollectionRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

function pruneUnsavedItems(userId: string) {
  getDb()
    .prepare(
      `DELETE FROM wall_note_collection_items
       WHERE collection_id IN (
         SELECT id FROM wall_note_collections WHERE user_id = ?
       )
       AND note_id NOT IN (
         SELECT note_id FROM wall_note_bookmarks WHERE user_id = ?
       )`,
    )
    .run(userId, userId);
}

export function listWallCollections(userId: string): WallCollection[] {
  pruneUnsavedItems(userId);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM wall_note_collections
       WHERE user_id = ?
       ORDER BY datetime(created_at) ASC, id ASC`,
    )
    .all(userId) as CollectionRow[];

  const items = db
    .prepare(
      `SELECT i.collection_id AS collectionId, i.note_id AS noteId
       FROM wall_note_collection_items i
       JOIN wall_note_collections c ON c.id = i.collection_id
       JOIN wall_notes n ON n.id = i.note_id AND n.hidden = 0
       WHERE c.user_id = ?
       ORDER BY datetime(i.created_at) ASC, i.note_id ASC`,
    )
    .all(userId) as Array<{ collectionId: string; noteId: string }>;

  const byCollection = new Map<string, string[]>();
  for (const item of items) {
    const list = byCollection.get(item.collectionId) ?? [];
    list.push(item.noteId);
    byCollection.set(item.collectionId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    noteIds: byCollection.get(row.id) ?? [],
  }));
}

export type CreateCollectionResult =
  | { ok: true; collection: WallCollection }
  | { ok: false; reason: "invalid" | "full" | "duplicate" };

export function createWallCollection(userId: string, name: string): CreateCollectionResult {
  const parsed = parseCollectionName(name);
  if (!parsed) return { ok: false, reason: "invalid" };

  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const write = db.transaction((): CreateCollectionResult => {
    const existing = db
      .prepare(`SELECT id, name FROM wall_note_collections WHERE user_id = ?`)
      .all(userId) as Array<{ id: string; name: string }>;
    if (existing.length >= COLLECTION_CAP) return { ok: false, reason: "full" };
    if (collectionNameTakenExcept(existing, parsed)) return { ok: false, reason: "duplicate" };
    try {
      db.prepare(
        `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, userId, parsed, now, now);
    } catch (error) {
      if (isUniqueConstraint(error)) return { ok: false, reason: "duplicate" };
      throw error;
    }
    return {
      ok: true,
      collection: { id, name: parsed, createdAt: now, updatedAt: now, noteIds: [] },
    };
  });

  return write();
}

export type RenameCollectionResult =
  | { ok: true; collection: WallCollection }
  | { ok: false; reason: "missing" | "invalid" | "duplicate" };

export function renameWallCollection(
  userId: string,
  collectionId: string,
  name: string,
): RenameCollectionResult {
  const parsed = parseCollectionName(name);
  if (!parsed) return { ok: false, reason: "invalid" };

  const db = getDb();
  const now = new Date().toISOString();
  const write = db.transaction((): RenameCollectionResult => {
    const current = db
      .prepare(`SELECT id, name, created_at FROM wall_note_collections WHERE id = ? AND user_id = ?`)
      .get(collectionId, userId) as { id: string; name: string; created_at: string } | undefined;
    if (!current) return { ok: false, reason: "missing" };
    const existing = db
      .prepare(`SELECT id, name FROM wall_note_collections WHERE user_id = ?`)
      .all(userId) as Array<{ id: string; name: string }>;
    if (collectionNameTakenExcept(existing, parsed, collectionId)) {
      return { ok: false, reason: "duplicate" };
    }
    try {
      db.prepare(
        `UPDATE wall_note_collections SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      ).run(parsed, now, collectionId, userId);
    } catch (error) {
      if (isUniqueConstraint(error)) return { ok: false, reason: "duplicate" };
      throw error;
    }
    const listed = listWallCollections(userId).find((item) => item.id === collectionId);
    return {
      ok: true,
      collection: listed ?? {
        id: collectionId,
        name: parsed,
        createdAt: current.created_at,
        updatedAt: now,
        noteIds: [],
      },
    };
  });

  return write();
}

export function deleteWallCollection(userId: string, collectionId: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM wall_note_collections WHERE id = ? AND user_id = ?`)
    .run(collectionId, userId);
  return result.changes > 0;
}

export type MembershipResult =
  | { ok: true; included: boolean }
  | { ok: false; reason: "missing" | "not_saved" };

export function setCollectionMembership(
  userId: string,
  collectionId: string,
  noteId: string,
  include: boolean,
): MembershipResult {
  const db = getDb();
  const owned = db
    .prepare(`SELECT id FROM wall_note_collections WHERE id = ? AND user_id = ?`)
    .get(collectionId, userId) as { id: string } | undefined;
  if (!owned) return { ok: false, reason: "missing" };

  if (!include) {
    db.prepare(
      `DELETE FROM wall_note_collection_items WHERE collection_id = ? AND note_id = ?`,
    ).run(collectionId, noteId);
    return { ok: true, included: false };
  }

  const row = db
    .prepare(
      `SELECT n.hidden AS hidden
       FROM wall_note_bookmarks b
       JOIN wall_notes n ON n.id = b.note_id
       WHERE b.user_id = ? AND b.note_id = ?`,
    )
    .get(userId, noteId) as { hidden: number } | undefined;

  const allowed = collectionMembershipAllowed({
    bookmarked: Boolean(row),
    hidden: Boolean(row?.hidden),
  });
  if (!allowed) return { ok: false, reason: "not_saved" };

  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO wall_note_collection_items (collection_id, note_id, created_at)
     VALUES (?, ?, ?)`,
  ).run(collectionId, noteId, createdAt);
  return { ok: true, included: true };
}
