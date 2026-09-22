import type { MonthlyDigest } from "@/lib/plus-insights";
import type { Review } from "@/lib/review-types";

export const POSTCARD_WIDTH = 960;
export const POSTCARD_HEIGHT = 640;

export const POSTCARD_COLORS = {
  cream: "#fff4e8",
  paper: "#fff8f2",
  blush: "#f4d4c6",
  peach: "#f8dcc8",
  mint: "#d5e6d8",
  accent: "#c47f6e",
  muted: "#8a7468",
  ink: "#3f342e",
  line: "#e8d5c8",
} as const;

export type SoftPostcardKind = "week" | "digest";

export type SoftPostcardLabels = {
  brand: string;
  kindWeek: string;
  kindDigest: string;
  feeling: (value: number) => string;
  noFeeling: string;
  energy: string;
  drain: string;
  summary: string;
  count: (value: number) => string;
  streak: (value: number) => string;
  avgFeeling: (value: number) => string;
  themes: string;
  footer: string;
};

export type SoftPostcardPayload =
  | {
      kind: "week";
      dateLabel: string;
      summary: string;
      feeling: number | null;
      energy: string;
      drain: string;
    }
  | {
      kind: "digest";
      monthLabel: string;
      count: number;
      avgFeeling: number | null;
      streak: number;
      energyWords: string[];
      drainWords: string[];
    };

export function truncateForPostcard(text: string, maxChars: number) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const chars = Array.from(trimmed);
  if (chars.length <= maxChars) return trimmed;
  return `${chars.slice(0, Math.max(1, maxChars - 1)).join("")}…`;
}

export function reviewToPostcardPayload(
  review: Pick<Review, "summary" | "feeling" | "energy" | "drain">,
  dateLabel: string,
): SoftPostcardPayload {
  return {
    kind: "week",
    dateLabel,
    summary: truncateForPostcard(review.summary || "", 120),
    feeling: review.feeling,
    energy: truncateForPostcard(review.energy || "", 140),
    drain: truncateForPostcard(review.drain || "", 140),
  };
}

export function digestToPostcardPayload(
  digest: MonthlyDigest,
  monthLabel: string,
): SoftPostcardPayload {
  return {
    kind: "digest",
    monthLabel,
    count: digest.count,
    avgFeeling: digest.avgFeeling,
    streak: digest.streak,
    energyWords: digest.energyKeywords.slice(0, 4).map((chip) => chip.word),
    drainWords: digest.drainKeywords.slice(0, 4).map((chip) => chip.word),
  };
}

export function postcardFilename(kind: SoftPostcardKind, stamp: string) {
  const safe = stamp
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `soft-boring-${kind}-${safe || "postcard"}.png`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [] as string[];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1] ?? "";
    if (ctx.measureText(last).width > maxWidth || words.join(" ").length > text.length) {
      // already wrapped
    }
    const remaining = words.join(" ");
    if (remaining && Array.from(text).length > Array.from(lines.join(" ")).length) {
      const chars = Array.from(lines[maxLines - 1] ?? "");
      if (chars.length > 2) {
        lines[maxLines - 1] = `${chars.slice(0, -1).join("")}…`;
      }
    }
  }
  return lines;
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

/** Draw a Soft Boring cream/blush postcard onto a 2d canvas context. */
export function drawSoftPostcard(
  ctx: CanvasRenderingContext2D,
  payload: SoftPostcardPayload,
  labels: SoftPostcardLabels,
) {
  const { width, height } = { width: POSTCARD_WIDTH, height: POSTCARD_HEIGHT };
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, POSTCARD_COLORS.cream);
  gradient.addColorStop(0.45, POSTCARD_COLORS.paper);
  gradient.addColorStop(1, POSTCARD_COLORS.blush);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 248, 242, 0.72)";
  fillRoundRect(ctx, 36, 36, width - 72, height - 72, 36);

  ctx.strokeStyle = POSTCARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  ctx.fillStyle = POSTCARD_COLORS.accent;
  ctx.font = "italic 28px Georgia, 'Times New Roman', serif";
  ctx.fillText(labels.brand, 84, 110);

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = "18px Nunito, 'Segoe UI', sans-serif";
  const kindLabel = payload.kind === "week" ? labels.kindWeek : labels.kindDigest;
  ctx.fillText(kindLabel, 84, 142);

  if (payload.kind === "week") {
    ctx.fillStyle = POSTCARD_COLORS.ink;
    ctx.font = "22px Nunito, 'Segoe UI', sans-serif";
    ctx.fillText(payload.dateLabel, 84, 188);

    ctx.font = "600 42px Georgia, 'Times New Roman', serif";
    const title =
      payload.summary.trim() ||
      (payload.feeling ? labels.feeling(payload.feeling) : labels.noFeeling);
    const titleLines = wrapLines(ctx, title, width - 180, 2);
    let y = 250;
    for (const line of titleLines) {
      ctx.fillText(line, 84, y);
      y += 52;
    }

    ctx.fillStyle = POSTCARD_COLORS.muted;
    ctx.font = "20px Nunito, 'Segoe UI', sans-serif";
    ctx.fillText(
      payload.feeling ? labels.feeling(payload.feeling) : labels.noFeeling,
      84,
      y + 12,
    );

    y += 56;
    ctx.fillStyle = POSTCARD_COLORS.mint;
    fillRoundRect(ctx, 84, y, (width - 200) / 2, 150, 24);
    ctx.fillStyle = POSTCARD_COLORS.blush;
    fillRoundRect(ctx, 108 + (width - 200) / 2, y, (width - 200) / 2, 150, 24);

    ctx.fillStyle = POSTCARD_COLORS.muted;
    ctx.font = "16px Nunito, 'Segoe UI', sans-serif";
    ctx.fillText(labels.energy, 108, y + 36);
    ctx.fillText(labels.drain, 132 + (width - 200) / 2, y + 36);

    ctx.fillStyle = POSTCARD_COLORS.ink;
    ctx.font = "20px Nunito, 'Segoe UI', sans-serif";
    const energyLines = wrapLines(
      ctx,
      payload.energy || "—",
      (width - 200) / 2 - 48,
      3,
    );
    const drainLines = wrapLines(
      ctx,
      payload.drain || "—",
      (width - 200) / 2 - 48,
      3,
    );
    let ey = y + 68;
    for (const line of energyLines) {
      ctx.fillText(line, 108, ey);
      ey += 28;
    }
    let dy = y + 68;
    for (const line of drainLines) {
      ctx.fillText(line, 132 + (width - 200) / 2, dy);
      dy += 28;
    }
  } else {
    ctx.fillStyle = POSTCARD_COLORS.ink;
    ctx.font = "22px Nunito, 'Segoe UI', sans-serif";
    ctx.fillText(payload.monthLabel, 84, 188);

    ctx.font = "600 40px Georgia, 'Times New Roman', serif";
    ctx.fillText(labels.count(payload.count), 84, 250);

    const cards = [
      {
        label: payload.avgFeeling == null ? labels.noFeeling : labels.avgFeeling(payload.avgFeeling),
        wash: POSTCARD_COLORS.peach,
      },
      {
        label: labels.streak(payload.streak),
        wash: POSTCARD_COLORS.mint,
      },
    ];
    cards.forEach((card, index) => {
      const x = 84 + index * 280;
      ctx.fillStyle = card.wash;
      fillRoundRect(ctx, x, 280, 260, 88, 22);
      ctx.fillStyle = POSTCARD_COLORS.ink;
      ctx.font = "20px Nunito, 'Segoe UI', sans-serif";
      ctx.fillText(card.label, x + 24, 332);
    });

    ctx.fillStyle = POSTCARD_COLORS.muted;
    ctx.font = "16px Nunito, 'Segoe UI', sans-serif";
    ctx.fillText(labels.themes, 84, 420);

    const chips = [
      ...payload.energyWords.map((word) => ({ word, wash: POSTCARD_COLORS.mint })),
      ...payload.drainWords.map((word) => ({ word, wash: POSTCARD_COLORS.blush })),
    ].slice(0, 6);

    let chipX = 84;
    const chipY = 448;
    ctx.font = "18px Nunito, 'Segoe UI', sans-serif";
    for (const chip of chips) {
      const label = truncateForPostcard(chip.word, 16);
      const tw = ctx.measureText(label).width + 36;
      if (chipX + tw > width - 84) break;
      ctx.fillStyle = chip.wash;
      fillRoundRect(ctx, chipX, chipY, tw, 40, 20);
      ctx.fillStyle = POSTCARD_COLORS.ink;
      ctx.fillText(label, chipX + 18, chipY + 26);
      chipX += tw + 12;
    }
  }

  ctx.fillStyle = POSTCARD_COLORS.muted;
  ctx.font = "16px Nunito, 'Segoe UI', sans-serif";
  ctx.fillText(labels.footer, 84, height - 72);
}

export async function renderSoftPostcardPng(
  payload: SoftPostcardPayload,
  labels: SoftPostcardLabels,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTCARD_WIDTH;
  canvas.height = POSTCARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Fall back to system fonts already set on the context.
    }
  }
  drawSoftPostcard(ctx, payload, labels);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("png_failed"));
      else resolve(blob);
    }, "image/png");
  });
}
