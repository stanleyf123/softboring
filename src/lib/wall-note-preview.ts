/** Resting lines on a readable Soft Wall sticky. */
export const WALL_NOTE_PREVIEW_LINES = 5;

/**
 * Hover and keyboard focus drop the clamp.
 * The excerpt is already short, so the open stays slight.
 */
export function wallNotePreviewLines(open: boolean): number | null {
  return open ? null : WALL_NOTE_PREVIEW_LINES;
}
