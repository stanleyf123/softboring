import { storedNickname } from "@/lib/nickname";

/** How many distinct nicknames the homepage strip shows. */
export const PUBLIC_NICKNAME_LIMIT = 8;

/** How many recent public notes to scan before deduping. */
export const PUBLIC_NICKNAME_SCAN = 48;

export type PublicNicknameSource = {
  nickname: string | null;
  postedAt: string;
};

function postedTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/**
 * Newest public nicknames, one chip each.
 * Email-shaped names and blanks stay off the strip. No email field is read.
 */
export function recentPublicNicknames(
  rows: readonly PublicNicknameSource[],
  limit = PUBLIC_NICKNAME_LIMIT,
) {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : PUBLIC_NICKNAME_LIMIT;
  const ordered = rows.map((row, index) => ({ row, index }));
  ordered.sort((left, right) => {
    const leftTime = postedTime(left.row.postedAt);
    const rightTime = postedTime(right.row.postedAt);
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    if (leftTime !== null && rightTime === null) return -1;
    if (leftTime === null && rightTime !== null) return 1;
    return left.index - right.index;
  });

  const seen = new Set<string>();
  const names: string[] = [];
  for (const { row } of ordered) {
    const nick = storedNickname(row.nickname);
    if (!nick || nick.includes("@")) continue;
    const key = nick.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(nick);
    if (names.length >= cap) break;
  }
  return names;
}
