/** Resting lines on a readable Soft Wall sticky. */
export const WALL_NOTE_PREVIEW_LINES = 5;

/**
 * Hover and keyboard focus show a little more of the same short excerpt.
 * The excerpt itself is already capped, so this stays a slight open.
 */
export const WALL_NOTE_PREVIEW_OPEN_LINES = 8;

export function wallNotePreviewLines(open: boolean) {
  return open ? WALL_NOTE_PREVIEW_OPEN_LINES : WALL_NOTE_PREVIEW_LINES;
}
