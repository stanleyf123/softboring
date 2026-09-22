import { ImageResponse } from "next/og";
import { assertLocale } from "@/lib/locale";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const alt = "Soft Boring Weekly — a gentle weekly review";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const kickerSafe =
    appLocale === "ja"
      ? "週に一度  ·  小さな休息"
      : appLocale === "zh-tw"
        ? "once a week  ·  a quiet pause"
        : "once a week  ·  not a to-do list";
  const line =
    appLocale === "ja"
      ? "六つの小さな問い。その週の気持ちを、そっと残す。"
      : "Six small questions. Save how the week felt.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#f6ebe3",
          color: "#4a3c35",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: 420,
            background: "#f4d4c6",
            top: -120,
            right: -80,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: 320,
            background: "#d5e6d8",
            bottom: -90,
            left: -60,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 40,
            background: "#fff8f2",
            top: 70,
            right: 90,
            border: "3px solid #ead6c8",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 80,
          }}
        >
          <div style={{ fontSize: 28, color: "#c47f6e", letterSpacing: 0.5 }}>
            {kickerSafe}
          </div>
          <div style={{ marginTop: 22, fontSize: 72, letterSpacing: -2, lineHeight: 1.05 }}>
            Soft Boring Weekly
          </div>
          <div style={{ marginTop: 18, fontSize: 34, color: "#9a7f74", maxWidth: 760 }}>
            {line}
          </div>
          <div style={{ marginTop: 48, fontSize: 24, color: "#7d9b8c" }}>softboring.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
