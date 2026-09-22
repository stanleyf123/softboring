import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";
import { wallOwnerNickname } from "@/lib/nickname";
import { noteExcerpt } from "@/lib/wall-canvas";
import { startOfIsoWeek } from "@/lib/timezone";

export const KINDNESS_DIGEST_LIMIT = 6;

export type KindnessStamp = {
  noteId: string;
  at: string;
  excerpt: string;
  nickname: string | null;
  hidden: boolean;
};

export type KindnessEchoStamp = KindnessStamp & {
  body: string;
};

export type KindnessDigest = {
  weekKey: string;
  since: string;
  thanks: KindnessStamp[];
  echoes: KindnessEchoStamp[];
};

type KindnessRow = {
  note_id: string;
  at: string;
  hidden: number | boolean;
  summary: string | null;
  energy: string | null;
  nickname: string | null;
  email: string | null;
  body?: string | null;
};

export const KINDNESS_THANKS_SQL = `
  SELECT
    t.note_id AS note_id,
    t.created_at AS at,
    n.hidden AS hidden,
    r.summary AS summary,
    r.energy AS energy,
    u.nickname AS nickname,
    u.email AS email
  FROM wall_note_thanks t
  JOIN wall_notes n ON n.id = t.note_id
  JOIN reviews r ON r.id = n.review_id
  LEFT JOIN users u ON u.id = n.user_id
  WHERE t.user_id = ?
    AND t.created_at >= ?
  ORDER BY t.created_at DESC
  LIMIT ?
`;

export const KINDNESS_ECHOES_SQL = `
  SELECT
    e.note_id AS note_id,
    CASE
      WHEN e.updated_at > e.created_at THEN e.updated_at
      ELSE e.created_at
    END AS at,
    e.body AS body,
    n.hidden AS hidden,
    r.summary AS summary,
    r.energy AS energy,
    u.nickname AS nickname,
    u.email AS email
  FROM wall_note_echoes e
  JOIN wall_notes n ON n.id = e.note_id
  JOIN reviews r ON r.id = n.review_id
  LEFT JOIN users u ON u.id = n.user_id
  WHERE e.user_id = ?
    AND (e.created_at >= ? OR e.updated_at >= ?)
  ORDER BY at DESC
  LIMIT ?
`;

export function kindnessWeekStart(now = new Date(), timeZone?: string | null) {
  return startOfIsoWeek(now, timeZone);
}

export function isInKindnessWeek(atIso: string, weekStart: Date) {
  const at = Date.parse(atIso);
  if (!Number.isFinite(at)) return false;
  return at >= weekStart.getTime();
}

export function trimKindness<T extends { at: string }>(
  items: T[],
  weekStart: Date,
  limit = KINDNESS_DIGEST_LIMIT,
) {
  const cap = Number.isFinite(limit) ? Math.min(12, Math.max(1, Math.floor(limit))) : KINDNESS_DIGEST_LIMIT;
  return items
    .filter((item) => isInKindnessWeek(item.at, weekStart))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, cap);
}

function stampFromRow(row: KindnessRow): KindnessStamp {
  return {
    noteId: row.note_id,
    at: row.at,
    excerpt: row.hidden ? "" : noteExcerpt(row.summary ?? "", row.energy ?? ""),
    nickname: wallOwnerNickname(row.nickname, row.email, { allowEmailFallback: false }),
    hidden: Boolean(row.hidden),
  };
}

export function toKindnessThanks(row: KindnessRow): KindnessStamp {
  return stampFromRow(row);
}

export function toKindnessEcho(row: KindnessRow): KindnessEchoStamp {
  const body = (row.body ?? "").replace(/\s+/g, " ").trim();
  return {
    ...stampFromRow(row),
    body: Array.from(body).slice(0, 80).join(""),
  };
}

export function shapeKindnessDigest(input: {
  thanks: KindnessStamp[];
  echoes: KindnessEchoStamp[];
  weekStart: Date;
  timeZone?: string | null;
  now?: Date;
  limit?: number;
}): KindnessDigest {
  const now = input.now ?? new Date();
  return {
    weekKey: isoWeekKeyInTimeZone(now, input.timeZone),
    since: input.weekStart.toISOString(),
    thanks: trimKindness(input.thanks, input.weekStart, input.limit),
    echoes: trimKindness(input.echoes, input.weekStart, input.limit),
  };
}
