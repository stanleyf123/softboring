import { noteExcerpt } from "./wall-canvas.ts";

export const SOFT_ACTIVITY_LIMIT = 24;

export type SoftActivityKind = "review" | "pin" | "thanks";

export type SoftActivityItem = {
  id: string;
  kind: SoftActivityKind;
  createdAt: string;
  excerpt: string;
  href: string;
};

export type SoftActivityRow = {
  kind: string;
  ref: string;
  created_at: string;
  summary: string | null;
  hidden: number | null;
  review_id: string | null;
};

export const SOFT_ACTIVITY_SQL = `
SELECT kind, ref, created_at, summary, hidden, review_id
FROM (
  SELECT
    'review' AS kind,
    id AS ref,
    created_at,
    summary,
    0 AS hidden,
    id AS review_id
  FROM reviews
  WHERE user_id = ?
  UNION ALL
  SELECT
    'pin',
    n.id,
    n.created_at,
    r.summary,
    n.hidden,
    n.review_id
  FROM wall_notes n
  JOIN reviews r ON r.id = n.review_id
  WHERE n.user_id = ?
  UNION ALL
  SELECT
    'thanks',
    t.note_id,
    t.created_at,
    '',
    COALESCE(n.hidden, 1),
    ''
  FROM wall_note_thanks t
  LEFT JOIN wall_notes n ON n.id = t.note_id
  WHERE t.user_id = ?
) AS activity
ORDER BY datetime(created_at) DESC, kind ASC
LIMIT ?
`;

const KINDS = new Set<SoftActivityKind>(["review", "pin", "thanks"]);

export function clampActivityLimit(value: unknown, fallback = SOFT_ACTIVITY_LIMIT) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(40, Math.max(1, Math.floor(n)));
}

function isKind(value: string): value is SoftActivityKind {
  return KINDS.has(value as SoftActivityKind);
}

function hrefFor(row: SoftActivityRow, kind: SoftActivityKind) {
  const ref = row.ref.trim();
  const hidden = Number(row.hidden) === 1;
  if (kind === "review") return `/history/${encodeURIComponent(ref)}`;
  if (kind === "pin") {
    const reviewId = row.review_id?.trim();
    if (hidden && reviewId) return `/history/${encodeURIComponent(reviewId)}`;
    return `/wall?note=${encodeURIComponent(ref)}`;
  }
  if (hidden) return "/wall";
  return `/wall?note=${encodeURIComponent(ref)}`;
}

export function rowsToSoftActivity(rows: SoftActivityRow[]): SoftActivityItem[] {
  const items: SoftActivityItem[] = [];
  for (const row of rows) {
    if (!row || typeof row.kind !== "string" || !isKind(row.kind)) continue;
    const ref = typeof row.ref === "string" ? row.ref.trim() : "";
    const createdAt = typeof row.created_at === "string" ? row.created_at.trim() : "";
    if (!ref || !createdAt) continue;
    const excerpt =
      row.kind === "thanks" ? "" : noteExcerpt(row.summary ?? "", "");
    items.push({
      id: `${row.kind}:${ref}:${createdAt}`,
      kind: row.kind,
      createdAt,
      excerpt,
      href: hrefFor(row, row.kind),
    });
  }
  return items;
}
