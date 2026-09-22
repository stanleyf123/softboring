import { sortExportBookmarks, type ExportBookmark } from "@/lib/collections-export";

export const BOOKMARKS_EXPORT_KIND = "softboring-bookmarks";
export const BOOKMARKS_EXPORT_FILENAME = "soft-boring-bookmarks.json";

export type BookmarkCollectionMembership = {
  noteId: string;
  collectionId: string;
  name: string;
};

function byNameThenId(
  left: { id: string; name: string },
  right: { id: string; name: string },
) {
  const byName = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  if (byName !== 0) return byName;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/** Bookmark ids, oldest first, plus the collections each one sits in. No note text. */
export function bookmarksExportPayload(input: {
  bookmarks: ExportBookmark[];
  memberships: BookmarkCollectionMembership[];
  exportedAt: string;
}) {
  const bookmarks = sortExportBookmarks(input.bookmarks);
  const saved = new Set(bookmarks.map((item) => item.noteId));
  const byNote = new Map<string, Array<{ id: string; name: string }>>();

  for (const membership of input.memberships) {
    if (!saved.has(membership.noteId)) continue;
    const name = membership.name.trim();
    const id = membership.collectionId.trim();
    if (!id) continue;
    const list = byNote.get(membership.noteId) ?? [];
    if (list.some((item) => item.id === id)) continue;
    list.push({ id, name });
    byNote.set(membership.noteId, list);
  }

  const items = bookmarks.map((bookmark) => ({
    noteId: bookmark.noteId,
    bookmarkedAt: bookmark.bookmarkedAt,
    collections: [...(byNote.get(bookmark.noteId) ?? [])].sort(byNameThenId),
  }));

  return {
    kind: BOOKMARKS_EXPORT_KIND,
    exportedAt: input.exportedAt,
    plan: "soft_plus" as const,
    bookmarkCount: items.length,
    bookmarks: items,
  };
}

export function bookmarksExportBody(input: {
  bookmarks: ExportBookmark[];
  memberships: BookmarkCollectionMembership[];
  exportedAt: string;
}) {
  return `${JSON.stringify(bookmarksExportPayload(input), null, 2)}\n`;
}
