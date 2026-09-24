"use client";

import {
  FRIEND_SHARE_LOCALES,
  canUseWebShare,
  friendShareBlurb,
  friendSharePath,
  friendShareSentence,
  shareFriendInvite,
  type FriendShareLocale,
} from "@/lib/friend-share";
import { COPY_TOAST_MS, copyShareText, resolveShareHref } from "@/lib/soft-copy-link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function fallbackCopy(text: string) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function langLabel(
  t: ReturnType<typeof useTranslations<"Account">>,
  locale: FriendShareLocale,
) {
  if (locale === "zh-tw") return t("friendShareLangZhTw");
  if (locale === "ja") return t("friendShareLangJa");
  return t("friendShareLangEn");
}

/** Quiet share card. Copy a public link and three short blurbs. No email, no prize. */
export function FriendShareCard({ nickname }: { nickname: string | null }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [origin, setOrigin] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<"shared" | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(canUseWebShare(navigator));
  }, []);

  useEffect(() => {
    if (!copied && !shareNote) return;
    const timer = window.setTimeout(() => {
      setCopied(null);
      setShareNote(null);
    }, COPY_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [copied, shareNote]);

  const path = friendSharePath(locale, nickname);
  const href = path ? resolveShareHref({ path, origin: origin || null }) : null;
  const link = href ?? path;

  async function copyText(id: string, text: string | null) {
    if (!text) {
      setError(true);
      return;
    }
    const ok = (await copyShareText(text, navigator.clipboard)) || fallbackCopy(text);
    if (!ok) {
      setError(true);
      setCopied(null);
      return;
    }
    setError(false);
    setShareNote(null);
    setCopied(id);
  }

  async function onShare() {
    if (!link) return;
    const sentenceLocale = locale === "zh-tw" || locale === "ja" || locale === "en" ? locale : "en";
    const result = await shareFriendInvite(navigator, {
      title: "Soft Boring",
      text: friendShareSentence(sentenceLocale),
      url: link,
    });
    if (result === "shared") {
      setError(false);
      setCopied(null);
      setShareNote("shared");
    }
  }

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-cream/90 px-5 py-5 shadow-card"
      data-friend-share=""
      data-friend-share-nick={nickname ? "1" : "0"}
    >
      <p className="font-display text-lg tracking-tight">{t("friendShareTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("friendShareBody")}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{t("friendShareNoPrize")}</p>
      {nickname ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("friendShareNickHint")}</p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("friendShareNoNick")}</p>
      )}

      {link ? (
        <label className="mt-4 block text-sm">
          <span className="text-muted">{t("friendShareLinkLabel")}</span>
          <input
            readOnly
            value={link}
            data-friend-share-link
            className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-sm"
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-friend-share-copy="link"
          onClick={() => void copyText("link", link)}
          className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("friendShareCopyLink")}
        </button>
        {canShare ? (
          <button
            type="button"
            data-friend-share-native
            onClick={() => void onShare()}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm shadow-card"
          >
            {t("friendShareNative")}
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm text-muted">{t("friendShareBlurbs")}</p>
        {FRIEND_SHARE_LOCALES.map((code) => {
          const blurb = link ? friendShareBlurb(code, link) : friendShareSentence(code);
          return (
            <div
              key={code}
              className="rounded-[1.1rem] bg-paper/80 px-4 py-3"
              data-friend-share-blurb={code}
            >
              <p className="text-xs text-muted">{langLabel(t, code)}</p>
              <p className="mt-1 text-sm leading-relaxed">{blurb}</p>
              <button
                type="button"
                data-friend-share-copy={code}
                onClick={() => void copyText(code, blurb)}
                className="mt-3 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                {t("friendShareCopyBlurb")}
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {t("friendShareCopyError")}
        </p>
      ) : null}
      {copied ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("friendShareCopied")}
        </p>
      ) : null}
      {shareNote === "shared" ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("friendShareShared")}
        </p>
      ) : null}
    </section>
  );
}
