import { getDb } from "./client";
import {
  NEIGHBOR_HIGHLIGHTS_LIMIT,
  NEIGHBOR_HIGHLIGHTS_SQL,
  toNeighborHighlight,
  type NeighborHighlight,
  type NeighborHighlightRow,
} from "@/lib/neighbor-highlights";

export type { NeighborHighlight } from "@/lib/neighbor-highlights";

export function listNeighborHighlights(
  sinceIso: string,
  limit = NEIGHBOR_HIGHLIGHTS_LIMIT,
): NeighborHighlight[] {
  const capped = Number.isFinite(limit)
    ? Math.min(12, Math.max(1, Math.floor(limit)))
    : NEIGHBOR_HIGHLIGHTS_LIMIT;
  const rows = getDb().prepare(NEIGHBOR_HIGHLIGHTS_SQL).all(sinceIso, capped) as NeighborHighlightRow[];
  return rows.map(toNeighborHighlight);
}
