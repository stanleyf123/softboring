"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

export function AccountPanel({
  email,
  createdAt,
  reviewCount,
}: {
  email: string;
  createdAt: string;
  reviewCount: number;
}) {
  const t = useTranslations("Account");
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
    <section className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
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
      </dl>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/history"
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("history")}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          {loggingOut ? t("loggingOut") : t("logout")}
        </button>
      </div>
    </section>
  );
}
