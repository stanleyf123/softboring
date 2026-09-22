import { storedNickname } from "@/lib/nickname";
import { ECHO_LIST_CAP, parseEchoBody } from "@/lib/soft-echo";
import { getDb } from "./client";
import { getWallNote } from "./wall";

export type WallEchoView = {
  body: string;
  createdAt: string;
  mine: boolean;
  author: string | null;
};

type EchoRow = {
  noteId: string;
  userId: string;
  body: string;
  createdAt: string;
  nickname: string | null;
};

function toView(row: EchoRow, viewerId: string | null): WallEchoView {
  return {
    body: row.body,
    createdAt: row.createdAt,
    mine: viewerId != null && viewerId === row.userId,
    author: storedNickname(row.nickname),
  };
}

export function listEchoesForNote(noteId: string, viewerId: string | null): WallEchoView[] {
  return echoesByNoteIds([noteId], viewerId).get(noteId) ?? [];
}

export function echoesByNoteIds(noteIds: string[], viewerId: string | null) {
  const map = new Map<string, WallEchoView[]>();
  if (noteIds.length === 0) return map;
  const placeholders = noteIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT e.note_id AS noteId,
              e.user_id AS userId,
              e.body AS body,
              e.created_at AS createdAt,
              u.nickname AS nickname
       FROM wall_note_echoes e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.note_id IN (${placeholders})
       ORDER BY datetime(e.created_at) ASC`,
    )
    .all(...noteIds) as EchoRow[];

  for (const row of rows) {
    const list = map.get(row.noteId) ?? [];
    list.push(toView(row, viewerId));
    map.set(row.noteId, list);
  }
  for (const [noteId, list] of map) {
    if (list.length > ECHO_LIST_CAP) map.set(noteId, list.slice(-ECHO_LIST_CAP));
  }
  return map;
}

/**
 * One quiet line per person per neighbor note. Separate from thanks.
 * Nothing is mailed, and there is no inbox.
 */
export function echoWallNote(userId: string, noteId: string, body: string) {
  const parsed = parseEchoBody(body);
  if (!parsed.ok) {
    const error = new Error(parsed.error);
    error.name = "EchoInvalidError";
    throw error;
  }

  const note = getWallNote(noteId, userId);
  if (!note) {
    const error = new Error("not_found");
    error.name = "EchoNotFoundError";
    throw error;
  }
  if (note.mine) {
    const error = new Error("own_note");
    error.name = "EchoOwnNoteError";
    throw error;
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, note_id) DO UPDATE SET
         body = excluded.body,
         updated_at = excluded.updated_at`,
    )
    .run(userId, noteId, parsed.body, now, now);

  const echoes = listEchoesForNote(noteId, userId);
  return {
    echoed: true as const,
    echoedByMe: true as const,
    echoes,
  };
}

export function withEchoes<T extends { id: string }>(
  notes: T[],
  viewerId: string | null,
): Array<T & { echoes: WallEchoView[]; echoedByMe: boolean }> {
  const grouped = echoesByNoteIds(
    notes.map((note) => note.id),
    viewerId,
  );
  return notes.map((note) => {
    const echoes = grouped.get(note.id) ?? [];
    return {
      ...note,
      echoes,
      echoedByMe: echoes.some((echo) => echo.mine),
    };
  });
}

export function attachEchoesToDetail<T extends { id: string }>(
  note: T,
  viewerId: string | null,
) {
  const echoes = listEchoesForNote(note.id, viewerId);
  return {
    ...note,
    echoes,
    echoedByMe: echoes.some((echo) => echo.mine),
  };
}
