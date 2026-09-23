/** Selector for a readable note that hover or focus has opened. */
export const WALL_NOTE_PREVIEW_OPEN_SELECTOR =
  ".soft-wall-note[data-note-preview='soft']:hover, .soft-wall-note[data-note-preview='soft']:focus-within";

export function isWallNotePreviewOpen(root: ParentNode | null | undefined) {
  if (!root || typeof root.querySelector !== "function") return false;
  return Boolean(root.querySelector(WALL_NOTE_PREVIEW_OPEN_SELECTOR));
}

/**
 * Escape on Soft Wall.
 * An open note dialog or sticker shop closes first.
 * Otherwise Escape folds a hover- or focus-opened sticky, and steps aside while typing.
 */
export function wallEscapeAction(input: {
  key: string;
  repeat?: boolean;
  typing: boolean;
  dialogOpen: boolean;
  previewOpen: boolean;
}): "close-dialog" | "rest-preview" | null {
  if (input.key !== "Escape" || input.repeat) return null;
  if (input.dialogOpen) return "close-dialog";
  if (input.typing || !input.previewOpen) return null;
  return "rest-preview";
}

/** Non-modal soft dialogs (the inbox bell) close on Escape unless a modal is already open. */
export function softDialogShouldClose(input: {
  key: string;
  repeat?: boolean;
  open: boolean;
  modalOpen: boolean;
}) {
  if (!input.open || input.modalOpen) return false;
  if (input.key !== "Escape" || input.repeat) return false;
  return true;
}
