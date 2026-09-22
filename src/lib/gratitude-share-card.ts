import { parseGratitudeBody } from "@/lib/gratitude-jar";
import { POSTCARD_COLORS } from "@/lib/soft-postcard";

export const GRATITUDE_CARD_WIDTH = 960;
export const GRATITUDE_CARD_HEIGHT = 640;

/** Stable name. The file does not carry an id, email, or date. */
export const GRATITUDE_SHARE_FILENAME = "soft-boring-gratitude.png";

export type GratitudeShareLabels = {
  brand: string;
  kind: string;
  footer: string;
};

const CARD_FONT =
  "Georgia, 'Noto Serif TC', 'Noto Serif JP', 'Songti TC', 'Times New Roman', serif";
const CARD_SANS =
  "Nunito, 'Noto Sans TC', 'Noto Sans JP', 'PingFang TC', 'Hiragino Sans', sans-serif";

/** The line that may appear on the card. Empty input stays empty. */
export function gratitudeShareLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return parseGratitudeBody(value) ?? "";
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

function wrapChars(
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
    lines[lines.length - 1] = last.length > 1 ? `${last.slice(0, -1).join("")}…` : "…";
  }
  return lines;
}

/** Cream card of one gratitude line. No name, date, or account field is drawn. */
export function drawGratitudeShareCard(
  ctx: CanvasRenderingContext2D,
  body: string,
  labels: GratitudeShareLabels,
) {
  const width = GRATITUDE_CARD_WIDTH;
  const height = GRATITUDE_CARD_HEIGHT;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, POSTCARD_COLORS.cream);
  gradient.addColorStop(0.5, POSTCARD_COLORS.paper);
  gradient.addColorStop(1, POSTCARD_COLORS.blush);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = POSTCARD_COLORS.blush;
  fillRoundRect(ctx, width - 250, -90, 340, 340, 170);
  ctx.fillStyle = POSTCARD_COLORS.mint;
  fillRoundRect(ctx, -80, height - 200, 280, 280, 140);

  ctx.fillStyle = "rgba(255, 248, 242, 0.82)";
  fillRoundRect(ctx, 48, 48, width - 96, height - 96, 36);

  ctx.strokeStyle = POSTCARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(68, 68, width - 136, height - 136);

  ctx.fillStyle = POSTCARD_COLORS.peach;
  fillRoundRect(ctx, 96, 104, 84, 12, 6);

  ctx.fillStyle = POSTCARD_COLORS.accent;
  ctx.font = `italic 28px ${CARD_FONT}`;
  ctx.fillText(labels.brand, 96, 168);

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = `20px ${CARD_SANS}`;
  ctx.fillText(labels.kind, 96, 208);

  ctx.fillStyle = POSTCARD_COLORS.ink;
  ctx.font = `italic 40px ${CARD_FONT}`;
  const lines = wrapChars(ctx, body, width - 200, 5);
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, 96, y);
    y += 56;
  }

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = `18px ${CARD_SANS}`;
  ctx.fillText(labels.footer, 96, height - 96);
}

export async function renderGratitudeSharePng(
  body: string,
  labels: GratitudeShareLabels,
): Promise<Blob> {
  const line = gratitudeShareLine(body);
  const canvas = document.createElement("canvas");
  canvas.width = GRATITUDE_CARD_WIDTH;
  canvas.height = GRATITUDE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // System fonts named on the context are enough.
    }
  }
  drawGratitudeShareCard(ctx, line, labels);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("png_failed"));
      else resolve(blob);
    }, "image/png");
  });
}
