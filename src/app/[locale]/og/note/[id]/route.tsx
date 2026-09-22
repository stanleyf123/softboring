import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { getPublicWallNoteOg } from "@/db/wall-note-og";
import { normalizeAppLocale } from "@/lib/locale-path";
import {
  WALL_NOTE_OG_COLORS,
  WALL_NOTE_OG_HEIGHT,
  WALL_NOTE_OG_WIDTH,
  wallNoteOgCopy,
} from "@/lib/wall-note-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
];

let fontData: ArrayBuffer | null | undefined;

async function loadOgFont() {
  if (fontData !== undefined) return fontData;
  for (const path of FONT_CANDIDATES) {
    try {
      const file = await readFile(path);
      fontData = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
      return fontData;
    } catch {
      // Try the next face. Latin still renders without one.
    }
  }
  fontData = null;
  return fontData;
}

type Context = {
  params: Promise<{ locale: string; id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { locale, id } = await context.params;
  const appLocale = normalizeAppLocale(locale);
  if (!appLocale) {
    return new Response("Not found", { status: 404 });
  }

  const card = getPublicWallNoteOg(id);
  if (!card) {
    return new Response("Not found", { status: 404 });
  }

  const copy = wallNoteOgCopy(appLocale);
  const line = card.excerpt || copy.quiet;
  const author = card.author || copy.anonymous;
  const font = await loadOgFont();
  const fontFamily = font ? "SoftOg" : "Georgia, serif";

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: WALL_NOTE_OG_COLORS.background,
          color: WALL_NOTE_OG_COLORS.ink,
          fontFamily,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: 420,
            background: WALL_NOTE_OG_COLORS.blush,
            top: -140,
            right: -80,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 300,
            background: WALL_NOTE_OG_COLORS.mint,
            bottom: -100,
            left: -70,
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 84px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: WALL_NOTE_OG_COLORS.accent,
            }}
          >
            {copy.kicker}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              width: 860,
              padding: "36px 40px",
              borderRadius: 36,
              background: WALL_NOTE_OG_COLORS.paper,
              border: `3px solid ${card.wash}`,
              fontSize: 42,
              lineHeight: 1.35,
            }}
          >
            {line}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 24,
              color: WALL_NOTE_OG_COLORS.muted,
            }}
          >
            {author}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 22,
              color: WALL_NOTE_OG_COLORS.sage,
            }}
          >
            {copy.brand}
          </div>
        </div>
      </div>
    ),
    {
      width: WALL_NOTE_OG_WIDTH,
      height: WALL_NOTE_OG_HEIGHT,
      fonts: font
        ? [{ name: "SoftOg", data: font, weight: 400, style: "normal" }]
        : undefined,
    },
  );
  image.headers.set("Cache-Control", "public, max-age=300");
  return image;
}
