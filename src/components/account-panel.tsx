"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { CheckoutButtons, PaymentsNotice, PortalButton } from "./billing-buttons";
import { SoftMark } from "./soft-doodles";

export function AccountPanel({
  email,
  createdAt,
  reviewCount,
  softPlus,
  stripeConfigured,
  hasStripeCustomer,
  checkoutSuccess,
}: {
  email: string;
  createdAt: string;
  reviewCount: number;
  softPlus: boolean;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  checkoutSuccess: boolean;
}) {
  const t = useTranslations("Account");
  const tPricing = useTranslations("Pricing");
  const format = useFormatter();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
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
