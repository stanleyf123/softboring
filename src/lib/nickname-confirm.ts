import { storedNickname } from "@/lib/nickname";

export type NicknameConfirmKind = "rename" | "clear";

/** A public nickname change waits for a soft confirm. Blank and whitespace match. */
export function nicknameChangePending(saved: string | null | undefined, draft: string) {
  return storedNickname(saved) !== storedNickname(draft);
}

export function nicknameConfirmKind(
  saved: string | null | undefined,
  draft: string,
): NicknameConfirmKind | null {
  if (!nicknameChangePending(saved, draft)) return null;
  return storedNickname(draft) ? "rename" : "clear";
}
