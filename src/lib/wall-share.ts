export const WALL_SHARE_ERROR_CODES = [
  "auth_required",
  "review_not_found",
  "review_required",
  "locked",
  "soft_plus_required",
  "forbidden",
] as const;

export type WallShareErrorCode = (typeof WALL_SHARE_ERROR_CODES)[number];
export type WallShareErrorKey = WallShareErrorCode | "generic";

export function parseWallShareError(value: unknown): WallShareErrorKey {
  if (
    typeof value === "string" &&
    (WALL_SHARE_ERROR_CODES as readonly string[]).includes(value)
  ) {
    return value as WallShareErrorCode;
  }
  return "generic";
}

export function wallSharePayload<T extends { id: string }>(note: T) {
  if (!note?.id) {
    const error = new Error("share_missing_id");
    error.name = "WallShareError";
    throw error;
  }
  return { note, wallNoteId: note.id };
}
