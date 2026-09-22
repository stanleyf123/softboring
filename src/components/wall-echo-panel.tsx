"use client";

import { ECHO_MAX_CHARS } from "@/lib/soft-echo";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type WallEchoItem = {
  body: string;
  createdAt: string;
  mine: boolean;
  author: string | null;
};

export function WallEchoList({ echoes }: { echoes: WallEchoItem[] }) {
  const t = useTranslations("Wall");
  if (echoes.length === 0) {
    return <p className="mt-2 text-sm text-muted">{t("echoEmpty")}</p>;
  }
  return (
    <ul className="mt-3 space-y-2" data-wall-echoes>
      {echoes.map((echo, index) => (
        <li key={`${echo.createdAt}:${index}:${echo.mine ? "mine" : "theirs"}`} className="rounded-2xl bg-mint/45 px-4 py-3">
          <p className="text-sm leading-relaxed">{echo.body}</p>
          <p className="mt-1 text-xs text-muted">
            {echo.mine ? t("echoMine") : echo.author || t("echoNeighbor")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function WallEchoComposer({
  initialBody = "",
  echoedByMe,
  busy,
  onSubmit,
}: {
  initialBody?: string;
  echoedByMe: boolean;
  busy: boolean;
  onSubmit: (body: string) => Promise<"ok" | "invalid" | "rate" | "error">;
}) {
  const t = useTranslations("Wall");
  const [body, setBody] = useState(initialBody);
  const [notice, setNotice] = useState<"invalid" | "rate" | "error" | null>(null);
  const length = Array.from(body).length;
  const tooLong = length > ECHO_MAX_CHARS;

  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || tooLong || body.trim().length === 0) return;
        setNotice(null);
        void onSubmit(body).then((result) => {
          setNotice(result === "ok" ? null : result);
        });
      }}
    >
      <label className="sr-only" htmlFor="wall-echo-body">
        {t("echoAria")}
      </label>
      <input
        id="wall-echo-body"
        value={body}
        maxLength={ECHO_MAX_CHARS + 8}
        onChange={(event) => setBody(event.target.value.replace(/[\r\n]+/g, " "))}
        placeholder={t("echoPlaceholder")}
        className="w-full rounded-full border border-line bg-cream/80 px-4 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        autoComplete="off"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {length}/{ECHO_MAX_CHARS}
        </p>
        <button
          type="submit"
          disabled={busy || tooLong || body.trim().length === 0}
          className="inline-flex min-h-11 items-center rounded-full bg-mint px-4 py-2 text-sm shadow-card disabled:opacity-60"
        >
          {echoedByMe ? t("echoUpdate") : t("echoSubmit")}
        </button>
      </div>
      {notice === "invalid" ? (
        <p className="mt-2 text-sm text-accent" role="status">
          {t("echoInvalid")}
        </p>
      ) : null}
      {notice === "rate" ? (
        <p className="mt-2 text-sm text-muted" role="status">
          {t("echoRate")}
        </p>
      ) : null}
      {notice === "error" ? (
        <p className="mt-2 text-sm text-accent" role="status">
          {t("echoError")}
        </p>
      ) : null}
    </form>
  );
}
