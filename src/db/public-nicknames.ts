import type { Database } from "better-sqlite3";
import {
  PUBLIC_NICKNAME_LIMIT,
  PUBLIC_NICKNAME_SCAN,
  recentPublicNicknames,
  type PublicNicknameSource,
} from "@/lib/public-nicknames";
import { getDb } from "./client";

type NicknameRow = {
  nickname: string | null;
  posted_at: string;
};

const NICKNAME_SQL = `
  SELECT u.nickname AS nickname, n.created_at AS posted_at
  FROM wall_notes n
  JOIN users u ON u.id = n.user_id
  WHERE n.hidden = 0
    AND u.nickname IS NOT NULL
    AND trim(u.nickname) <> ''
  ORDER BY datetime(n.created_at) DESC
  LIMIT ?
`;

export function listRecentPublicNicknameRows(
  db: Database,
  scan = PUBLIC_NICKNAME_SCAN,
): PublicNicknameSource[] {
  const limit = Number.isFinite(scan) && scan > 0 ? Math.floor(scan) : PUBLIC_NICKNAME_SCAN;
  const rows = db.prepare(NICKNAME_SQL).all(limit) as NicknameRow[];
  return rows.map((row) => ({
    nickname: row.nickname,
    postedAt: row.posted_at,
  }));
}

/** Homepage strip. Nicknames only — the query never selects email. */
export function listRecentPublicNicknames(limit = PUBLIC_NICKNAME_LIMIT) {
  return recentPublicNicknames(listRecentPublicNicknameRows(getDb()), limit);
}
