import { nicknameWallQuery } from "@/lib/nickname-wall-link";
import { normalizeAppLocale } from "@/lib/locale-path";

export const FRIEND_SHARE_LOCALES = ["en", "zh-tw", "ja"] as const;

export type FriendShareLocale = (typeof FRIEND_SHARE_LOCALES)[number];

const SENTENCES: Record<FriendShareLocale, string> = {
  en: "A quiet weekly desk, if you ever want one. Soft Boring.",
  "zh-tw": "若你想要一張安靜的週回顧桌子，這裡是 Soft Boring。",
  ja: "静かな週の机がよければ、Soft Boring です。",
};

/**
 * A public door. Nickname deep-links reuse `/wall?nick=`.
 * No invite code, no email, no reward.
 */
export function friendSharePath(
  locale: string,
  nickname?: string | null,
): string | null {
  const loc = normalizeAppLocale(locale);
  if (!loc) return null;
  const nick = nicknameWallQuery(nickname);
  if (!nick) return `/${loc}`;
  return `/${loc}/wall?nick=${encodeURIComponent(nick)}`;
}

export function isFriendShareLocale(value: string): value is FriendShareLocale {
  return (FRIEND_SHARE_LOCALES as readonly string[]).includes(value);
}

export function friendShareSentence(locale: string): string {
  if (!isFriendShareLocale(locale)) return SENTENCES.en;
  return SENTENCES[locale];
}

/** Ready to paste. The link is the whole invitation — nothing else is promised. */
export function friendShareBlurb(locale: string, link: string): string {
  const sentence = friendShareSentence(locale);
  const href = link.trim();
  if (!href) return sentence;
  return `${sentence} ${href}`;
}

export function canUseWebShare(nav: { share?: unknown } | null | undefined) {
  return typeof nav?.share === "function";
}

export async function shareFriendInvite(
  nav: { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> } | null | undefined,
  input: { title: string; text: string; url: string },
): Promise<"shared" | "dismissed" | "unavailable"> {
  if (!canUseWebShare(nav) || !nav?.share) return "unavailable";
  try {
    await nav.share({
      title: input.title,
      text: input.text,
      url: input.url,
    });
    return "shared";
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
      return "dismissed";
    }
    return "dismissed";
  }
}
