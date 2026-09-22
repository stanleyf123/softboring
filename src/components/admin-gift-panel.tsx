"use client";

import { adminCopy } from "@/lib/admin-copy";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type GiftRow = {
  code: string;
  days: number | null;
  permanent: boolean;
  note: string | null;
  createdAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
  redeemedEmail: string | null;
};

export function AdminGiftMintForm() {
  const router = useRouter();
  const copy = adminCopy.gifts;
  const [mode, setMode] = useState<"days" | "permanent">("days");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [minted, setMinted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    setMinted(null);
    setCopied(false);
    try {
      const response = await fetch("/api/admin/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permanent: mode === "permanent",
          days: mode === "days" ? Number(days) : null,
          note: note.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { code?: { code?: string } };
      if (!response.ok || !data.code?.code) {
        setError(true);
        return;
      }
      setMinted(data.code.code);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.75rem] bg-paper px-6 py-6 shadow-card sm:px-8"
    >
      <p className="font-display text-xl tracking-tight">{copy.mintTitle}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{copy.mintLead}</p>
      <p
        className="mt-4 max-w-xl rounded-[1.25rem] bg-mint/45 px-4 py-3 text-sm leading-relaxed text-muted"
        data-admin-gift-mint
      >
        {copy.mintGuide}
      </p>

      <fieldset className="mt-5 flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">{copy.modeLabel}</legend>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="gift-mode"
            checked={mode === "days"}
            onChange={() => setMode("days")}
          />
          {copy.modeDays}
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="gift-mode"
            checked={mode === "permanent"}
            onChange={() => setMode("permanent")}
          />
          {copy.modePermanent}
        </label>
      </fieldset>

      {mode === "days" ? (
        <label className="mt-4 block max-w-xs text-sm">
          <span className="text-muted">{copy.daysLabel}</span>
          <input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className="mt-2 w-full rounded-full border border-line bg-canvas px-4 py-2"
            required
          />
        </label>
      ) : null}

      <label className="mt-4 block max-w-lg text-sm">
        <span className="text-muted">{copy.noteLabel}</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder={copy.notePlaceholder}
          className="mt-2 w-full rounded-full border border-line bg-canvas px-4 py-2"
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
        >
          {busy ? copy.minting : copy.mint}
        </button>
        {error ? <p className="text-sm text-muted">{copy.mintError}</p> : null}
      </div>

      {minted ? (
        <div className="mt-6 rounded-[1.25rem] bg-mint/50 px-4 py-4">
          <p className="text-sm text-muted">{copy.mintedLabel}</p>
          <p className="mt-1 font-mono text-lg tracking-wide">{minted}</p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-3 rounded-full border border-line bg-paper px-4 py-2 text-sm"
          >
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function AdminGiftEmpty() {
  const copy = adminCopy.gifts;
  return (
    <section
      className="mt-8 rounded-[1.75rem] bg-mint/50 px-6 py-6 shadow-card sm:px-8"
      data-admin-gift-empty
      aria-labelledby="admin-gift-empty-title"
    >
      <p id="admin-gift-empty-title" className="font-display text-xl tracking-tight">
        {copy.emptyTitle}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{copy.empty}</p>
      <ol className="mt-5 space-y-3">
        {copy.emptySteps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs text-muted"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-[1.25rem] bg-cream/80 px-4 py-3 text-sm leading-relaxed text-muted">
        {copy.emptyMintNote}
      </p>
    </section>
  );
}

export function AdminGiftTable({ codes }: { codes: GiftRow[] }) {
  const copy = adminCopy.gifts;
  if (codes.length === 0) {
    return <AdminGiftEmpty />;
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-[1.75rem] bg-paper shadow-card">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-4 py-3 font-normal">{copy.colCode}</th>
            <th className="px-4 py-3 font-normal">{copy.colKind}</th>
            <th className="px-4 py-3 font-normal">{copy.colNote}</th>
            <th className="px-4 py-3 font-normal">{copy.colCreated}</th>
            <th className="px-4 py-3 font-normal">{copy.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((row) => (
            <tr key={row.code} className="border-b border-line/70 last:border-0">
              <td className="px-4 py-3 font-mono text-xs sm:text-sm">{row.code}</td>
              <td className="px-4 py-3">
                {row.permanent
                  ? copy.kindPermanent
                  : copy.kindDays(row.days ?? 0)}
              </td>
              <td className="px-4 py-3 text-muted">{row.note ?? copy.dash}</td>
              <td className="px-4 py-3 text-muted">
                {new Date(row.createdAt).toLocaleString("zh-TW")}
              </td>
              <td className="px-4 py-3">
                {row.redeemedAt
                  ? copy.statusRedeemed(
                      row.redeemedEmail ?? row.redeemedBy?.slice(0, 8) ?? "—",
                      new Date(row.redeemedAt).toLocaleString("zh-TW"),
                    )
                  : copy.statusUnused}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
