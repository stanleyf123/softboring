export const WALL_CANVAS = {
  width: 2800,
  height: 2000,
  noteWidth: 216,
  noteHeight: 236,
} as const;

export const WALL_PIN_Z = 50_000;

export const WALL_COLORS = [
  "peach",
  "blush",
  "mint",
  "cream",
  "lemon",
  "sky",
] as const;

export type WallColor = (typeof WALL_COLORS)[number];

/** Soft+ personal washes. They sit beside the shared palette, not inside it. */
export const PLUS_NOTE_COLORS = ["lilac", "rose", "fern", "apricot"] as const;

export type PlusNoteColor = (typeof PLUS_NOTE_COLORS)[number];

export type NoteColor = WallColor | PlusNoteColor;

export const STICKER_PACK_SLUG = "pack";
export const STICKER_PACK_PRICE_CENTS = 499;
export const STICKER_PACK_QTY = 1;

export function isWallColor(value: string): value is WallColor {
  return (WALL_COLORS as readonly string[]).includes(value);
}

export function isPlusNoteColor(value: string): value is PlusNoteColor {
  return (PLUS_NOTE_COLORS as readonly string[]).includes(value);
}

export function isNoteColor(value: string): value is NoteColor {
  return isWallColor(value) || isPlusNoteColor(value);
}

/**
 * Palette colors stay available to anyone who already sends one.
 * A personal color is Soft+ only, and it wins over the shared preference
 * when no explicit palette color was chosen.
 */
export function resolveShareNoteColor(input: {
  requested?: string | null;
  softPlus: boolean;
  preferredWallColor?: string | null;
  customNoteColor?: string | null;
  index: number;
}): NoteColor {
  const requested = input.requested?.trim() ?? "";
  if (requested && isWallColor(requested)) return requested;
  if (input.softPlus && requested && isPlusNoteColor(requested)) return requested;
  if (input.softPlus) {
    const custom = input.customNoteColor?.trim() ?? "";
    if (custom && isPlusNoteColor(custom)) return custom;
    const preferred = input.preferredWallColor?.trim() ?? "";
    if (preferred && isWallColor(preferred)) return preferred;
  }
  return colorForIndex(input.index);
}

export function displayNoteColor(value: string | null | undefined): NoteColor {
  if (typeof value === "string" && isNoteColor(value)) return value;
  return "peach";
}

export function colorForIndex(index: number): WallColor {
  return WALL_COLORS[((index % WALL_COLORS.length) + WALL_COLORS.length) % WALL_COLORS.length];
}

export function notePositionForIndex(index: number) {
  const cols = 8;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = 72 + col * 260 + (index % 3) * 16;
  const y = 72 + row * 268 + (index % 2) * 22;
  return {
    x: clamp(x, 24, WALL_CANVAS.width - WALL_CANVAS.noteWidth - 24),
    y: clamp(y, 24, WALL_CANVAS.height - WALL_CANVAS.noteHeight - 24),
  };
}

export function clampNotePosition(x: number, y: number) {
  return {
    x: clamp(x, 8, WALL_CANVAS.width - 48),
    y: clamp(y, 8, WALL_CANVAS.height - 48),
  };
}

export function noteExcerpt(summary: string, energy: string) {
  const fromSummary = summary.trim();
  if (fromSummary) return sliceText(fromSummary, 96);
  const fromEnergy = energy.trim();
  if (fromEnergy) return sliceText(fromEnergy, 96);
  return "";
}

function sliceText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type TeaserSticker = {
  stickerId: string;
  slug: string;
  emoji: string;
  count: number;
};

export function toTeaserNote(note: {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  praiseCount: number;
  ownerNickname?: string | null;
  ownerIsDemo?: boolean;
  thankCount?: number;
  stickers?: TeaserSticker[];
}) {
  const thankCount =
    typeof note.thankCount === "number" && Number.isFinite(note.thankCount)
      ? Math.max(0, Math.floor(note.thankCount))
      : 0;
  const stickers = Array.isArray(note.stickers)
    ? note.stickers.map((sticker) => ({
        stickerId: sticker.stickerId,
        slug: sticker.slug,
        emoji: sticker.emoji,
        count: sticker.count,
      }))
    : [];
  return {
    id: note.id,
    x: note.x,
    y: note.y,
    z: note.z,
    color: displayNoteColor(note.color),
    praiseCount: note.praiseCount,
    ownerNickname: note.ownerNickname?.trim() ? note.ownerNickname.trim() : null,
    ownerIsDemo: Boolean(note.ownerIsDemo),
    thankCount,
    stickers,
  };
}
