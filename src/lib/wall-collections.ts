/** A short name for a private pile of bookmarked wall notes. */
export const COLLECTION_NAME_MAX = 32;

/** A shelf stays a shelf. Eight named piles is enough. */
export const COLLECTION_CAP = 8;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WallCollection = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  noteIds: string[];
};

export function parseCollectionName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const single = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const clipped = Array.from(single).slice(0, COLLECTION_NAME_MAX).join("").trim();
  return clipped.length > 0 ? clipped : null;
}

export function collectionNameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/** `exceptId` is the collection being renamed, so its current name does not collide with itself. */
export function collectionNameTakenExcept(
  existing: Array<{ id: string; name: string }>,
  name: string,
  exceptId?: string,
): boolean {
  const key = collectionNameKey(name);
  return existing.some((item) => item.id !== exceptId && collectionNameKey(item.name) === key);
}

export function parseCollectionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

export function collectionMembershipAllowed(input: {
  bookmarked: boolean;
  hidden: boolean;
}): boolean {
  return input.bookmarked && !input.hidden;
}
