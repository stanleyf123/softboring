import type { AppLocale } from "@/i18n/routing";
import { normalizeAppLocale } from "@/lib/locale-path";
import { storedNickname } from "@/lib/nickname";
import { isShareId } from "@/lib/soft-copy-link";
import { displayNoteColor, noteExcerpt, type NoteColor } from "@/lib/wall-canvas";

export const WALL_NOTE_OG_WIDTH = 1200;
export const WALL_NOTE_OG_HEIGHT = 630;

/** Cream / blush / peach / mint — the same wash as the site OG card. */
export const WALL_NOTE_OG_COLORS = {
  background: "#f6ebe3",
  blush: "#f4d4c6",
  peach: "#f8dcc8",
  mint: "#d5e6d8",
  paper: "#fff8f2",
  accent: "#c47f6e",
  ink: "#4a3c35",
  muted: "#9a7f74",
  line: "#ead6c8",
  sage: "#7d9b8c",
} as const;

const NOTE_WASH: Record<NoteColor, string> = {
  peach: "#f8dcc8",
  blush: "#f4d4c6",
  mint: "#d5e6d8",
  cream: "#fff4e8",
  lemon: "#f3e3b6",
  sky: "#d5e4ea",
  lilac: "#eadcf6",
  rose: "#f6d0da",
  fern: "#c9e0d2",
  apricot: "#f6d2b8",
};

export type WallNoteOgSource = {
  id: string;
  summary: string;
  energy: string;
  color: string | null;
  ownerNickname: string | null;
  hidden: boolean;
};

/** Public card only. Excerpt and an optional nickname — never an email or id pile. */
export type WallNoteOgCard = {
  noteId: string;
  excerpt: string;
  author: string | null;
  color: NoteColor;
  wash: string;
};

export type WallNoteOgCopy = {
  kicker: string;
  quiet: string;
  anonymous: string;
  brand: string;
};

const COPY: Record<AppLocale, WallNoteOgCopy> = {
  en: {
    kicker: "a note on Soft Wall",
    quiet: "A quiet note, resting here.",
    anonymous: "a neighbor",
    brand: "softboring.com",
  },
  "zh-tw": {
    kicker: "軟軟牆上的一張便利貼",
    quiet: "一張安靜的便利貼，停在這裡。",
    anonymous: "一位鄰居",
    brand: "softboring.com",
  },
  ja: {
    kicker: "ソフトウォールの一枚",
    quiet: "静かなメモが、ここにあります。",
    anonymous: "となりの人",
    brand: "softboring.com",
  },
};

function calmLine(value: string, maxChars: number) {
  const single = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const chars = Array.from(single);
  if (chars.length <= maxChars) return single;
  return `${chars.slice(0, Math.max(1, maxChars - 1)).join("")}…`;
}

export function wallNoteOgCopy(locale: string): WallNoteOgCopy {
  const appLocale = normalizeAppLocale(locale) ?? "en";
  return COPY[appLocale];
}

/**
 * A share preview of a public wall note.
 * Hidden notes, bad ids, emails, and review ids never become part of the card.
 */
export function toPublicWallNoteOg(source: WallNoteOgSource): WallNoteOgCard | null {
  if (source.hidden) return null;
  if (!isShareId(source.id)) return null;
  const color = displayNoteColor(source.color);
  const excerpt = calmLine(noteExcerpt(source.summary ?? "", source.energy ?? ""), 96);
  const author = storedNickname(source.ownerNickname);
  return {
    noteId: source.id,
    excerpt,
    author: author ? calmLine(author, 24) : null,
    color,
    wash: NOTE_WASH[color],
  };
}

/** Locale path for the PNG. `zh-TW` is rewritten to `zh-tw`. */
export function wallNoteOgPath(locale: string, noteId: string): string | null {
  const loc = normalizeAppLocale(locale);
  if (!loc || !isShareId(noteId)) return null;
  return `/${loc}/og/note/${noteId}`;
}

/** Wall deep link. Canonical pages stay `/wall`; this is the social URL. */
export function wallNoteQueryPath(noteId: string): string | null {
  if (!isShareId(noteId)) return null;
  return `/wall?note=${encodeURIComponent(noteId)}`;
}
