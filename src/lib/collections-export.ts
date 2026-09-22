import type { WallCollection } from "@/lib/wall-collections";

export const COLLECTIONS_EXPORT_KIND = "softboring-collections";
export const COLLECTIONS_EXPORT_FILENAME = "soft-boring-collections.json";

export type ExportBookmark = {
  noteId: string;
  bookmarkedAt: string;
};

function timeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Oldest bookmark first, then id, so the file stays calm across downloads. */
export function sortExportBookmarks(bookmarks: ExportBookmark[]): ExportBookmark[] {
  return [...bookmarks].sort((left, right) => {
    const byTime = timeValue(left.bookmarkedAt) - timeValue(right.bookmarkedAt);
    if (byTime !== 0) return byTime;
    return left.noteId < right.noteId ? -1 : left.noteId > right.noteId ? 1 : 0;
  });
}

export function collectionsExportPayload(input: {
  collections: WallCollection[];
  bookmarks: ExportBookmark[];
  exportedAt: string;
}) {
  const bookmarks = sortExportBookmarks(input.bookmarks);
  const bookmarkedNoteIds = bookmarks.map((item) => item.noteId);
  return {
    kind: COLLECTIONS_EXPORT_KIND,
    exportedAt: input.exportedAt,
    plan: "soft_plus" as const,
    bookmarkCount: bookmarkedNoteIds.length,
    collectionCount: input.collections.length,
    bookmarkedNoteIds,
    bookmarks,
    collections: input.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      noteIds: [...collection.noteIds],
    })),
  };
}

export function collectionsExportBody(input: {
  collections: WallCollection[];
  bookmarks: ExportBookmark[];
  exportedAt: string;
}) {
  return `${JSON.stringify(collectionsExportPayload(input), null, 2)}\n`;
}
