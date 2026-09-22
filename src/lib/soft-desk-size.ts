/** A gentle snapshot of how much this desk is keeping. Not a byte count. */

const SIZE_CAP = 100_000;

export type SoftDeskSize = {
  reviews: number;
  notes: number;
};

export function nonNegativeCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(SIZE_CAP, Math.floor(value));
}

export function softDeskSize(reviewCount: number, wallNoteCount: number): SoftDeskSize {
  return {
    reviews: nonNegativeCount(reviewCount),
    notes: nonNegativeCount(wallNoteCount),
  };
}
