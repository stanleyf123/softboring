import { ImageResponse } from "next/og";
import { assertLocale } from "@/lib/locale";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const kicker = appLocale === "zh-tw" ? "once a week · 每週一次" : "once a week · not a to-do list";
  const title =
    appLocale === "zh-tw"
      ? "Soft Boring Weekly"
      : "Soft Boring Weekly";
  const line =
    appLocale === "zh-tw"
      ? "A gentle weekly review"
      : "A gentle weekly review";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #f6ebe3 0%, #f4d4c6 45%, #d5e6d8 100%)",
          color: "#4a3c35",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#c47f6e" }}>{kicker}</div>
        <div style={{ marginTop: 24, fontSize: 72, letterSpacing: -2 }}>{title}</div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#9a7f74" }}>{line}</div>
      </div>
    ),
    { ...size },
  );
}
