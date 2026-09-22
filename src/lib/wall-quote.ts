import { POSTCARD_COLORS, truncateForPostcard } from "@/lib/soft-postcard";
import { displayNoteColor, type NoteColor } from "@/lib/wall-canvas";

export const QUOTE_CARD_WIDTH = 840;
export const QUOTE_CARD_HEIGHT = 1050;

export const QUOTE_WASH: Record<NoteColor, string> = {
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

export type WallQuoteLabels = {
  brand: string;
  kind: string;
  footer: string;
  anonymous: string;
  emptyQuote: string;
};

export type WallQuotePayload = {
  noteId: string;
  quote: string;
  author: string | null;
  color: NoteColor;
};

const QUOTE_FONT =
  "Georgia, 'Noto Serif TC', 'Noto Serif JP', 'Songti TC', 'Times New Roman', serif";
const QUOTE_SANS =
  "Nunito, 'Noto Sans TC', 'Noto Sans JP', 'PingFang TC', 'Hiragino Sans', sans-serif";

export function wallQuoteText(summary: string, energy: string, maxChars = 160) {
  const fromSummary = summary.trim().replace(/\s+/g, " ");
  if (fromSummary) return truncateForPostcard(fromSummary, maxChars);
  const fromEnergy = energy.trim().replace(/\s+/g, " ");
  if (fromEnergy) return truncateForPostcard(fromEnergy, maxChars);
  return "";
}

export function wallQuoteColor(value: string | null | undefined): NoteColor {
  return displayNoteColor(value);
}

export function quoteCardFilename(noteId: string) {
  const safe = noteId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `soft-boring-quote-${safe || "note"}.png`;
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

function wrapByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const chars = Array.from(text.trim());
  if (chars.length === 0 || maxLines < 1) return [] as string[];
  const lines: string[] = [];
  let current = "";
  let index = 0;
  while (index < chars.length && lines.length < maxLines) {
    const next = current + chars[index];
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      index += 1;
      continue;
    }
    if (!current) {
      current = chars[index] ?? "";
      index += 1;
    }
    lines.push(current);
    current = "";
  }
  if (current && lines.length < maxLines) lines.push(current);
  const shown = Array.from(lines.join("")).length;
  if (shown < chars.length && lines.length > 0) {
    const last = Array.from(lines[lines.length - 1] ?? "");
    lines[lines.length - 1] =
      last.length > 1 ? `${last.slice(0, -1).join("")}…` : "…";
  }
  return lines;
}

/** Cream quote card, same palette as the soft postcard. */
export function drawWallQuoteCard(
  ctx: CanvasRenderingContext2D,
  payload: WallQuotePayload,
  labels: WallQuoteLabels,
) {
  const width = QUOTE_CARD_WIDTH;
  const height = QUOTE_CARD_HEIGHT;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, POSTCARD_COLORS.cream);
  gradient.addColorStop(0.55, POSTCARD_COLORS.paper);
  gradient.addColorStop(1, QUOTE_WASH[payload.color]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 248, 242, 0.78)";
  fillRoundRect(ctx, 36, 36, width - 72, height - 72, 36);

  ctx.strokeStyle = POSTCARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, width - 112, height - 112);

  ctx.fillStyle = QUOTE_WASH[payload.color];
  fillRoundRect(ctx, 88, 96, 72, 10, 5);

  ctx.fillStyle = POSTCARD_COLORS.accent;
  ctx.font = `italic 26px ${QUOTE_FONT}`;
  ctx.fillText(labels.brand, 88, 156);

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = `18px ${QUOTE_SANS}`;
  ctx.fillText(labels.kind, 88, 190);

  const quote = payload.quote.trim() || labels.emptyQuote;
  ctx.fillStyle = POSTCARD_COLORS.ink;
  ctx.font = `italic 40px ${QUOTE_FONT}`;
  const lines = wrapByWidth(ctx, quote, width - 176, 8);
  let y = 280;
  for (const line of lines) {
    ctx.fillText(line, 88, y);
    y += 56;
  }

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = `22px ${QUOTE_SANS}`;
  const author = payload.author?.trim() || labels.anonymous;
  ctx.fillText(author, 88, Math.min(y + 48, height - 150));

  ctx.font = `16px ${QUOTE_SANS}`;
  ctx.fillText(labels.footer, 88, height - 88);
}

export async function renderWallQuotePng(
  payload: WallQuotePayload,
  labels: WallQuoteLabels,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = QUOTE_CARD_WIDTH;
  canvas.height = QUOTE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // System fonts already named on the context are enough.
    }
  }
  drawWallQuoteCard(ctx, payload, labels);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("png_failed"));
      else resolve(blob);
    }, "image/png");
  });
}
