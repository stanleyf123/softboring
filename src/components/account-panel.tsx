"use client";

import { CustomQuestionsEditor } from "@/components/custom-questions-editor";
import { SeasonalPacksPanel } from "@/components/seasonal-packs-panel";
import { SoftIntentionCard } from "@/components/soft-intention-card";
import { SoftLeaveCard } from "@/components/soft-leave-card";
import { SoftMemoryCard } from "@/components/soft-memory-card";
import { SoftTipsCard } from "@/components/soft-tips-card";
import { Link, useRouter } from "@/i18n/navigation";
import type { CustomQuestion } from "@/lib/custom-questions";
import { NICKNAME_MAX } from "@/lib/nickname";
import type { MonthlyDigest } from "@/lib/plus-insights";
import type { SoftMemory } from "@/lib/soft-memory";
import { oauthIdentityLabel } from "@/lib/oauth-config";
import {
  daysUntilPlanExpiry,
  planExpiryReminderDue,
} from "@/lib/plan";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { PLUS_THANKS_PATH } from "@/lib/thanks-path";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckoutButtons, PaymentsNotice, PortalButton } from "./billing-buttons";
import { SoftMark } from "./soft-doodles";

function weekdayLabel(
  t: ReturnType<typeof useTranslations<"Account">>,
  day: number,
) {
  switch (day) {
    case 1:
      return t("weekday.1");
    case 2:
      return t("weekday.2");
    case 3:
      return t("weekday.3");
    case 4:
      return t("weekday.4");
    case 5:
      return t("weekday.5");
    case 6:
      return t("weekday.6");
    default:
      return t("weekday.0");
  }
}

export function AccountPanel({
  email,
  createdAt,
  reviewCount,
  softPlus,
  planExpiresAt = null,
  softMemory = null,
  stripeConfigured,
  hasStripeCustomer,
  checkoutSuccess,
  reminderEnabled,
  reminderWeekday,
  timezone,
  seasonalFrame = false,
  emailConfigured,
  customQuestions,
  digest,
  nickname,
}: {
  email: string;
  createdAt: string;
  reviewCount: number;
  softPlus: boolean;
  planExpiresAt?: string | null;
  softMemory?: SoftMemory | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  checkoutSuccess: boolean;
  reminderEnabled: boolean;
  reminderWeekday: number;
  timezone: string;
  seasonalFrame?: boolean;
  emailConfigured: boolean;
  customQuestions: CustomQuestion[];
  digest: MonthlyDigest;
  nickname: string | null;
}) {
  const t = useTranslations("Account");
  const tPricing = useTranslations("Pricing");
  const format = useFormatter();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [weeklyOn, setWeeklyOn] = useState(reminderEnabled);
  const [weekday, setWeekday] = useState(reminderWeekday);
  const [zone, setZone] = useState(timezone || DEFAULT_TIMEZONE);
  const [frameOn, setFrameOn] = useState(seasonalFrame);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const [savingFrame, setSavingFrame] = useState(false);
  const [zoneSaved, setZoneSaved] = useState(false);
  const timeZones = useMemo(() => {
    const supported =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [DEFAULT_TIMEZONE, "UTC"];
    const withCurrent = supported.includes(zone) ? supported : [zone, ...supported];
    return [DEFAULT_TIMEZONE, ...withCurrent.filter((item) => item !== DEFAULT_TIMEZONE)];
  }, [zone]);
  const [packQuestions, setPackQuestions] = useState(customQuestions);
  const joined = format.dateTime(new Date(createdAt), { dateStyle: "medium" });
  const identity = oauthIdentityLabel(email);
  const expiresLabel =
    softPlus && planExpiresAt
      ? format.dateTime(new Date(planExpiresAt), { dateStyle: "medium" })
      : null;
  const daysLeft =
    softPlus && planExpiresAt ? daysUntilPlanExpiry(planExpiresAt) : null;
  const showExpiryReminder =
    softPlus && expiresLabel != null && planExpiryReminderDue(planExpiresAt);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      {checkoutSuccess ? (
        <p className="rounded-[1.5rem] bg-mint/80 px-5 py-4 text-sm leading-relaxed" role="status">
          {softPlus ? t("checkoutSuccessPlus") : t("checkoutSuccess")}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] bg-paper shadow-card">
        <div className="flex items-start justify-between gap-4 bg-blush/60 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <SoftMark className="h-10 w-10" />
            <div>
              <p className="font-display text-xl tracking-tight">{t("cardTitle")}</p>
              <p className="text-sm text-muted">{t("cardNote")}</p>
            </div>
          </div>
          <span
            className={
              softPlus
                ? "rounded-full bg-mint px-3 py-1 text-sm"
                : "rounded-full bg-peach px-3 py-1 text-sm"
            }
          >
            {softPlus ? t("planSoftPlus") : t("planFree")}
          </span>
        </div>

        <div className="px-6 py-8 sm:px-8">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">{t("email")}</dt>
              <dd className="mt-1 break-all text-lg">
                {identity === "google"
                  ? t("signedInWithGoogle")
                  : identity === "line"
                    ? t("signedInWithLine")
                    : email}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("joined")}</dt>
              <dd className="mt-1">{t("since", { date: joined })}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("reviewsLabel")}</dt>
              <dd className="mt-1">{t("reviewCount", { count: reviewCount })}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("planLabel")}</dt>
              <dd className="mt-1">
                {softPlus ? t("planSoftPlusBody") : t("planFreeBody")}
              </dd>
              {expiresLabel ? (
                <p className="mt-2 text-sm text-muted">
                  {t("planGiftUntil", { date: expiresLabel })}
                </p>
              ) : null}
              {showExpiryReminder && daysLeft != null ? (
                <p
                  className="mt-3 rounded-[1.1rem] bg-lemon/50 px-4 py-3 text-sm leading-relaxed text-muted"
                  role="status"
                >
                  {t("planGiftExpiringSoon", {
                    days: daysLeft,
                    date: expiresLabel,
                  })}
                </p>
              ) : null}
            </div>
          </dl>

          <NicknameEditor initialNickname={nickname} />
          <SoftMemoryCard memory={softMemory} />
          <SoftIntentionCard signedIn variant="account" />
          <SoftTipsCard softPlus={softPlus} />
          <InviteCard softPlus={softPlus} />
          <GiftRedeemCard softPlus={softPlus} />

          {softPlus ? (
            <div className="mt-8 rounded-[1.5rem] bg-peach/50 px-5 py-5">
              <p className="font-display text-lg tracking-tight">{t("digestTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("digestBody")}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.1rem] bg-paper/80 px-4 py-3">
                  <dt className="text-xs text-muted">{t("digestCountLabel")}</dt>
                  <dd className="mt-1 font-display text-2xl tracking-tight">
                    {t("digestCount", { count: digest.count })}
                  </dd>
                </div>
                <div className="rounded-[1.1rem] bg-paper/80 px-4 py-3">
                  <dt className="text-xs text-muted">{t("digestFeelingLabel")}</dt>
                  <dd className="mt-1 font-display text-2xl tracking-tight">
                    {digest.avgFeeling == null
                      ? t("digestFeelingEmpty")
                      : t("digestFeeling", { value: digest.avgFeeling })}
                  </dd>
                </div>
              </dl>
              <Link
                href="/digest"
                className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
              >
                {t("digestOpen")}
              </Link>
            </div>
          ) : null}

          {softPlus ? (
            <div className="mt-8 rounded-[1.5rem] bg-blush/40 px-5 py-5">
              <p className="font-display text-lg tracking-tight">{t("yearTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("yearBody")}</p>
              <Link
                href="/year"
                className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
              >
                {t("yearOpen")}
              </Link>
            </div>
          ) : null}

          <div className="mt-8 rounded-[1.5rem] bg-mint/50 px-5 py-5">
            <p className="font-display text-lg tracking-tight">{t("reminderTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("reminderBody")}</p>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={weeklyOn}
                onChange={async (event) => {
                  const next = event.target.checked;
                  setWeeklyOn(next);
                  setSavingReminder(true);
                  try {
                    await fetch("/api/account/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reminderEnabled: next }),
                    });
                  } finally {
                    setSavingReminder(false);
                  }
                }}
              />
              {t("reminderToggle")}
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-muted">{t("reminderWeekday")}</span>
              <select
                className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2"
                value={weekday}
                disabled={!weeklyOn}
                onChange={async (event) => {
                  const next = Number(event.target.value);
                  setWeekday(next);
                  setSavingReminder(true);
                  try {
                    await fetch("/api/account/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reminderWeekday: next }),
                    });
                  } finally {
                    setSavingReminder(false);
                  }
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <option key={day} value={day}>
                    {weekdayLabel(t, day)}
                  </option>
                ))}
              </select>
            </label>
            <p id="member-timezone" className="mt-5 font-display text-base tracking-tight">
              {t("timezoneTitle")}
            </p>
            <label className="mt-3 block text-sm">
              <span className="text-muted">{t("timezoneLabel")}</span>
              <select
                className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2"
                value={zone}
                onChange={async (event) => {
                  const next = event.target.value;
                  setZone(next);
                  setZoneSaved(false);
                  setSavingZone(true);
                  try {
                    const response = await fetch("/api/account/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ timezone: next }),
                    });
                    if (response.ok) setZoneSaved(true);
                  } finally {
                    setSavingZone(false);
                  }
                }}
              >
                {timeZones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("timezoneBody")}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("timezoneNote")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingZone}
                onClick={async () => {
                  setZoneSaved(false);
                  setSavingZone(true);
                  try {
                    const response = await fetch("/api/account/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ timezone: zone }),
                    });
                    if (response.ok) setZoneSaved(true);
                  } finally {
                    setSavingZone(false);
                  }
                }}
                className="rounded-full bg-paper px-4 py-1.5 text-sm shadow-card disabled:opacity-60"
              >
                {t("timezoneConfirm")}
              </button>
              <p className="text-xs text-muted">
                {emailConfigured ? t("reminderEmailOn") : t("reminderEmailOff")}
                {savingReminder ? ` · ${t("reminderSaving")}` : null}
                {savingZone ? ` · ${t("timezoneSaving")}` : null}
                {zoneSaved && !savingZone ? ` · ${t("timezoneSaved")}` : null}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-peach/40 px-5 py-5">
            <p className="font-display text-lg tracking-tight">{t("seasonalFrameTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("seasonalFrameBody")}</p>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={frameOn}
                onChange={async (event) => {
                  const next = event.target.checked;
                  setFrameOn(next);
                  setSavingFrame(true);
                  try {
                    await fetch("/api/account/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ seasonalFrame: next }),
                    });
                  } finally {
                    setSavingFrame(false);
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-line accent-accent"
              />
              <span>
                {t("seasonalFrameToggle")}
                {savingFrame ? (
                  <span className="mt-1 block text-xs text-muted">{t("seasonalFrameSaving")}</span>
                ) : null}
              </span>
            </label>
          </div>

          {softPlus ? (
            <>
              <CustomQuestionsEditor
                key={packQuestions.map((item) => item.id).join("|")}
                initialQuestions={packQuestions}
              />
              <SeasonalPacksPanel
                mode="account"
                onCustomApplied={setPackQuestions}
              />
            </>
          ) : null}

          {!softPlus ? (
            <div className="mt-8 rounded-[1.5rem] bg-cream px-5 py-5">
              <p className="font-display text-lg tracking-tight">{t("dataDownloadTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("dataDownloadBody")}</p>
              <a
                href="/api/account/export"
                className="mt-4 inline-flex rounded-full bg-paper px-5 py-2.5 text-sm shadow-card"
              >
                {t("dataDownloadCta")}
              </a>
            </div>
          ) : null}

          {!softPlus ? (
            <div className="mt-8 rounded-[1.5rem] bg-peach/60 px-5 py-5">
              <p className="font-display text-lg tracking-tight">{t("upgradeTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("upgradeBody")}</p>
              <div className="mt-4">
                {stripeConfigured ? (
                  <CheckoutButtons
                    configured={stripeConfigured}
                    loggedIn
                    softPlus={false}
                    yearlyAvailable={false}
                    monthlyLabel={null}
                    yearlyLabel={null}
                  />
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/pricing"
                      className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
                    >
                      {t("upgrade")}
                    </Link>
                    <PaymentsNotice compact />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/history"
              className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
            >
              {t("history")}
            </Link>
            <Link
              href="/wall"
              className="rounded-full bg-blush px-5 py-2.5 text-sm shadow-card"
            >
              {t("wall")}
            </Link>
            {softPlus ? (
              <Link
                href="/wall/saved"
                className="rounded-full bg-cream px-5 py-2.5 text-sm shadow-card"
              >
                {t("savedWall")}
              </Link>
            ) : null}
            {softPlus ? (
              <Link
                href="/trends"
                className="rounded-full bg-mint px-5 py-2.5 text-sm shadow-card"
              >
                {t("trends")}
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-full bg-peach px-5 py-2.5 text-sm shadow-card"
              >
                {tPricing("navHint")}
              </Link>
            )}
            {softPlus ? (
              <Link
                href="/digest"
                className="rounded-full bg-lemon px-5 py-2.5 text-sm shadow-card"
              >
                {t("digest")}
              </Link>
            ) : null}
            <Link
              href="/account/snapshot"
              className="rounded-full bg-cream px-5 py-2.5 text-sm shadow-card"
            >
              {t("softMonth")}
            </Link>
            {softPlus ? (
              <Link
                href="/history/export"
                className="rounded-full border border-line px-5 py-2.5 text-sm"
              >
                {t("export")}
              </Link>
            ) : null}
            {softPlus && hasStripeCustomer ? <PortalButton /> : null}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
            >
              {loggingOut ? t("loggingOut") : t("logout")}
            </button>
          </div>
          <SoftLeaveCard email={email} />
        </div>
      </section>
    </div>
  );
}

function InviteCard({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [link, setLink] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/account/invite?locale=${encodeURIComponent(locale)}`);
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { link?: string | null; redeemedCount?: number };
        if (cancelled) return;
        setLink(data.link ?? null);
        setCount(data.redeemedCount ?? 0);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function makeLink() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/account/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        link?: string | null;
        redeemedCount?: number;
      };
      if (!response.ok || !data.link) {
        setError(true);
        return;
      }
      setLink(data.link);
      setCount(data.redeemedCount ?? 0);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!ready) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-mint/30 px-5 py-5">
        <p className="font-display text-lg tracking-tight">
          {softPlus ? t("inviteTitle") : t("inviteLockedTitle")}
        </p>
      </div>
    );
  }

  if (!softPlus && !link) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-peach/40 px-5 py-5">
        <p className="font-display text-lg tracking-tight">{t("inviteLockedTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inviteLockedBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("inviteLockedCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-[1.5rem] bg-mint/40 px-5 py-5">
      <p className="font-display text-lg tracking-tight">{t("inviteTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("inviteBody")}</p>
      <p className="mt-3 text-sm text-muted">{t("inviteReward")}</p>
      {link ? (
        <div className="mt-4">
          <label className="block text-sm">
            <span className="text-muted">{t("inviteLinkLabel")}</span>
            <input
              readOnly
              value={link}
              className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-sm"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
            >
              {t("inviteCopy")}
            </button>
            {copied ? (
              <p className="text-sm text-muted" role="status">
                {t("inviteCopied")}
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted">
            {count > 0 ? t("inviteCount", { count }) : t("inviteEmpty")}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={makeLink}
            disabled={busy || !softPlus}
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
          >
            {busy ? t("inviteMaking") : t("inviteMake")}
          </button>
          {error ? (
            <p className="mt-3 text-sm text-accent" role="alert">
              {t("inviteError")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GiftRedeemCard({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (softPlus) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-blush/30 px-5 py-5">
        <p className="font-display text-lg tracking-tight">{t("giftTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("giftAlreadyPlus")}</p>
      </div>
    );
  }

  async function redeem(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/gift-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        permanent?: boolean;
        days?: number | null;
      };
      if (!response.ok) {
        setError(data.error ?? "invalid");
        return;
      }
      setCode("");
      // Warm Soft+ thank-you with soft next steps (wall, digest, nickname).
      router.push(`${PLUS_THANKS_PATH}?from=gift`);
      router.refresh();
    } catch {
      setError("invalid");
    } finally {
      setBusy(false);
    }
  }

  function errorCopy(codeValue: string | null) {
    switch (codeValue) {
      case "already_plus":
        return t("giftErrorAlreadyPlus");
      case "already_used":
        return t("giftErrorUsed");
      case "not_found":
        return t("giftErrorMissing");
      case "rate_limited":
        return t("giftErrorRate");
      default:
        return t("giftError");
    }
  }

  return (
    <form
      onSubmit={redeem}
      className="mt-8 rounded-[1.5rem] bg-lemon/40 px-5 py-5"
    >
      <p className="font-display text-lg tracking-tight">{t("giftTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("giftBody")}</p>
      <label className="mt-4 block text-sm">
        <span className="text-muted">{t("giftCodeLabel")}</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("giftCodePlaceholder")}
          className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 font-mono text-sm tracking-wide"
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.trim().length < 8}
        className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
      >
        {busy ? t("giftRedeeming") : t("giftRedeem")}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {errorCopy(error)}
        </p>
      ) : null}
    </form>
  );
}

function nicknameErrorCopy(
  t: ReturnType<typeof useTranslations<"Account">>,
  code: string | null,
) {
  switch (code) {
    case "nickname_too_short":
      return t("nicknameTooShort");
    case "nickname_too_long":
      return t("nicknameTooLong");
    case "invalid_nickname":
      return t("nicknameInvalid");
    default:
      return t("nicknameError");
  }
}

function NicknameEditor({ initialNickname }: { initialNickname: string | null }) {
  const t = useTranslations("Account");
  const [value, setValue] = useState(initialNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/account/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: value }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        nickname?: string | null;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "generic");
        return;
      }
      setValue(data.nickname ?? "");
      setSaved(true);
    } catch {
      setError("generic");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-8 rounded-[1.5rem] bg-blush/50 px-5 py-5"
    >
      <p className="font-display text-lg tracking-tight">{t("nicknameTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("nicknameBody")}</p>
      <label className="mt-4 block text-sm">
        <span className="text-muted">{t("nicknameLabel")}</span>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
            setError(null);
          }}
          maxLength={NICKNAME_MAX}
          placeholder={t("nicknamePlaceholder")}
          autoComplete="nickname"
          className="mt-2 w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <p className="mt-2 text-xs text-muted">{t("nicknameHint")}</p>
      <p className="mt-1 text-xs text-muted">{t("nicknameEmptyHint")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {saving ? t("nicknameSaving") : t("nicknameSave")}
        </button>
        {saved ? (
          <p className="text-sm text-muted" role="status">
            {t("nicknameSaved")}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-accent" role="alert">
            {nicknameErrorCopy(t, error)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
