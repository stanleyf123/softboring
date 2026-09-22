/** Public sticker slugs. New gentle ones stay in the same catalog and checkout. */
export const WALL_STICKER_SLUGS = [
  "star",
  "heart",
  "sprout",
  "tea",
  "moon",
  "cloud",
  "peach",
  "sparkle",
  "blossom",
  "leaf",
  "honey",
  "shell",
  "candle",
] as const;

export type WallStickerSlug = (typeof WALL_STICKER_SLUGS)[number];

export const EXPANDED_STICKERS = [
  { id: "sticker-blossom", slug: "blossom", name: "Blossom", emoji: "🌸", sortOrder: 9 },
  { id: "sticker-leaf", slug: "leaf", name: "Leaf", emoji: "🍃", sortOrder: 10 },
  { id: "sticker-honey", slug: "honey", name: "Honey", emoji: "🍯", sortOrder: 11 },
  { id: "sticker-shell", slug: "shell", name: "Shell", emoji: "🐚", sortOrder: 12 },
  { id: "sticker-candle", slug: "candle", name: "Candle", emoji: "🕯️", sortOrder: 13 },
] as const;

export function isWallStickerSlug(value: string): value is WallStickerSlug {
  return (WALL_STICKER_SLUGS as readonly string[]).includes(value);
}
