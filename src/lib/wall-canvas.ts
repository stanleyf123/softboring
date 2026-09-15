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

export const STICKER_PACK_SLUG = "pack";
export const STICKER_PACK_PRICE_CENTS = 499;
export const STICKER_PACK_QTY = 1;

export function isWallColor(value: string): value is WallColor {
  return (WALL_COLORS as readonly string[]).includes(value);
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

export function toTeaserNote(note: {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  praiseCount: number;
}) {
  return {
    id: note.id,
    x: note.x,
    y: note.y,
    z: note.z,
    color: isWallColor(note.color) ? note.color : "peach",
    praiseCount: note.praiseCount,
  };
}
