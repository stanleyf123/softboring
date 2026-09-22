import { attachBookmarkToDetail } from "./wall-bookmarks";
import { attachFlagToDetail } from "./wall-flags";
import { attachThanksToDetail } from "./wall-thanks";
import type { WallNoteDetail } from "./wall";

export function withViewerNoteState(note: WallNoteDetail, userId: string | null) {
  return attachThanksToDetail(
    attachFlagToDetail(attachBookmarkToDetail(note, userId), userId),
    userId,
  );
}
