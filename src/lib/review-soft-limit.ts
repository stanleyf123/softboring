/**
 * A quiet hint once one review field is this many characters.
 * Saving still works. The server keeps its own technical cap.
 */
export const REVIEW_FIELD_SOFT_HINT_AT = 400;

export function reviewFieldLength(text: string) {
  return Array.from(text.normalize("NFC")).length;
}

export function reviewFieldNeedsSoftHint(
  text: string,
  hintAt = REVIEW_FIELD_SOFT_HINT_AT,
) {
  if (!Number.isFinite(hintAt) || hintAt < 1) return false;
  return reviewFieldLength(text) >= hintAt;
}
