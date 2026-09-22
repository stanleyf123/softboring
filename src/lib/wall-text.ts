/** localStorage key for the free Soft Wall larger-text preference. */
export const WALL_LARGER_TEXT_STORAGE_KEY = "softboring.wall-larger-text";

/** Default note copy is `text-sm` (0.875rem). Larger is a small step up. */
export const WALL_NOTE_COPY_REM = 0.875;
export const WALL_NOTE_COPY_LARGER_REM = 1.0625;

export function storedWallLargerText(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
