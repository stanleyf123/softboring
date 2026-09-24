import { parseNickname } from "@/lib/nickname";

/**
 * A nickname safe to put in `?nick=` and to search notes already on the page.
 * Email-shaped names stay off the link. Nothing is fetched because of this string.
 */
export function nicknameWallQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.includes("@")) return null;
  try {
    const nick = parseNickname(value);
    if (!nick || nick.includes("@")) return null;
    return nick;
  } catch {
    return null;
  }
}
