"use client";

import { CustomQuestionsEditor } from "@/components/custom-questions-editor";
import { Link, useRouter } from "@/i18n/navigation";
import type { CustomQuestion } from "@/lib/custom-questions";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
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
  stripeConfigured,
  hasStripeCustomer,
  checkoutSuccess,
  reminderEnabled,
  reminderWeekday,
  emailConfigured,
  customQuestions,
  digest,
}: {
  email: string;
  createdAt: string;
  reviewCount: number;
  softPlus: boolean;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  checkoutSuccess: boolean;
  reminderEnabled: boolean;
  reminderWeekday: number;
  emailConfigured: boolean;
  customQuestions: CustomQuestion[];
  digest: { year: number; month: number; count: number; avgFeeling: number | null };
}) {
  const t = useTranslations("Account");
  const tPricing = useTranslations("Pricing");
  const format = useFormatter();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [weeklyOn, setWeeklyOn] = useState(reminderEnabled);
  const [weekday, setWeekday] = useState(reminderWeekday);
  const [savingReminder, setSavingReminder] = useState(false);
  const joined = format.dateTime(new Date(createdAt), { dateStyle: "medium" });

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
          <dl className="space-y-6">
            <div>
              <dt className="text-sm text-muted">{t("email")}</dt>
              <dd className="mt-1 break-all text-lg">{email}</dd>
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
            </div>
          </dl>

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
            <p className="mt-3 text-xs text-muted">
              {emailConfigured ? t("reminderEmailOn") : t("reminderEmailOff")}
              {savingReminder ? ` · ${t("reminderSaving")}` : null}
            </p>
          </div>

          {softPlus ? <CustomQuestionsEditor initialQuestions={customQuestions} /> : null}

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
        </div>
      </section>
    </div>
  );
}
