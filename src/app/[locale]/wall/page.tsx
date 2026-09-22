import { WallBoard } from "@/components/wall-board";
import { ensureUserSettings, updateUserSettings } from "@/db/user-settings";
import { getPublicWallNoteOg } from "@/db/wall-note-og";
import { listWallSpotlight } from "@/db/wall-spotlight";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { userIsSoftPlus } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { wallNoteOgPath, wallNoteQueryPath } from "@/lib/wall-note-og";
import { rotatingSpotlightIndex, toPublicSpotlightCard } from "@/lib/wall-spotlight";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sticker?: string; shared?: string; note?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  const noteId = typeof query.note === "string" ? query.note : "";
  const card = noteId ? getPublicWallNoteOg(noteId) : null;
  const imagePath = card ? wallNoteOgPath(appLocale, card.noteId) : null;
  const socialPath = card ? wallNoteQueryPath(card.noteId) : null;
  if (card && imagePath && socialPath) {
    const description = card.excerpt || t("wallNoteQuiet");
    return pageMetadata({
      locale: appLocale,
      title: t("wallNoteTitle"),
      description,
      path: "/wall",
      socialPath,
      image: { url: imagePath, alt: description },
    });
  }
  return pageMetadata({
    locale: appLocale,
    title: t("wallTitle"),
    description: t("wallDescription"),
    path: "/wall",
  });
}

export default async function WallPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);
  const t = await getTranslations("Wall");
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);
  const settings = user ? ensureUserSettings(user.id) : null;
  const guestSpotlight = softPlus
    ? []
    : listWallSpotlight(5).map(toPublicSpotlightCard);
  const guestSpotlightIndex = rotatingSpotlightIndex(guestSpotlight.length, Date.now());
  if (user) {
    updateUserSettings(user.id, { onboardingWallSeen: true });
  }

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 pt-2">
      <h1 className="sr-only">{t("title")}</h1>
      <WallBoard
        signedIn={Boolean(user)}
        softPlus={softPlus}
        stickerSuccess={query.sticker === "success"}
        sharedSuccess={query.shared === "1"}
        initialNoteId={typeof query.note === "string" ? query.note : null}
        initialSeasonalFrame={Boolean(settings?.seasonalFrame)}
        initialWallLargerText={Boolean(settings?.wallLargerText)}
        guestSpotlight={guestSpotlight}
        guestSpotlightIndex={guestSpotlightIndex}
      />
    </div>
  );
}
