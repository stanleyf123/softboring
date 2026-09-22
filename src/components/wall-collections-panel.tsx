"use client";

import { Link } from "@/i18n/navigation";
import {
  COLLECTION_CAP,
  COLLECTION_NAME_MAX,
  type WallCollection,
} from "@/lib/wall-collections";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type CollectionNotice = "full" | "duplicate" | "invalid" | "not_saved" | "generic" | null;

export function WallCollectionsTease() {
  const t = useTranslations("WallCollections");
  return (
    <section
      className="rounded-[1.75rem] bg-mint/50 px-6 py-6 shadow-card sm:px-8"
      data-wall-collections="tease"
    >
      <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">{t("teaseTitle")}</h2>
      <p className="mt-3 max-w-md leading-relaxed text-muted">{t("teaseBody")}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted" data-collections-export="tease">
        {t("exportTeaseBody")}
      </p>
      <p className="mt-2 text-sm text-muted">{t("privacy")}</p>
      <Link
        href="/pricing"
        className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
      >
        {t("teaseCta")}
      </Link>
    </section>
  );
}

export function WallCollectionsPanel({
  collections,
  activeId,
  busy,
  notice,
  onActive,
  onCreate,
  onRename,
  onDelete,
}: {
  collections: WallCollection[];
  activeId: string | null;
  busy: boolean;
  notice: CollectionNotice;
  onActive: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("WallCollections");
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = collections.find((item) => item.id === activeId) ?? null;
  const full = collections.length >= COLLECTION_CAP;

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = name.trim();
    if (!next || busy) return;
    onCreate(next);
    setName("");
  }

  return (
    <section
      className="rounded-[1.75rem] bg-mint/40 px-5 py-6 shadow-card sm:px-7"
      data-wall-collections="open"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm italic text-accent">{t("eyebrow")}</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight">{t("title")}</h2>
        </div>
        <p className="text-xs text-muted">
          {t("capHint", { count: collections.length, cap: COLLECTION_CAP })}
        </p>
      </div>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-1 text-xs text-muted">{t("privacy")}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t("title")}>
        <button
          type="button"
          aria-pressed={activeId == null}
          data-collection-filter="all"
          onClick={() => {
            onActive(null);
            setRenaming(false);
            setConfirmingDelete(false);
          }}
          className={
            activeId == null
              ? "rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
              : "rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted"
          }
        >
          {t("all")}
        </button>
        {collections.map((collection) => {
          const selected = collection.id === activeId;
          return (
            <button
              key={collection.id}
              type="button"
              aria-pressed={selected}
              data-collection-id={collection.id}
              onClick={() => {
                onActive(collection.id);
                setRenaming(false);
                setConfirmingDelete(false);
                setRenameValue(collection.name);
              }}
              className={
                selected
                  ? "rounded-full bg-paper px-4 py-2 text-sm shadow-card"
                  : "rounded-full border border-line bg-paper/50 px-4 py-2 text-sm text-muted"
              }
            >
              {collection.name}
            </button>
          );
        })}
      </div>

      {full ? (
        <p className="mt-4 text-sm text-muted">{t("full")}</p>
      ) : (
        <form onSubmit={submitCreate} className="mt-5 flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("nameLabel")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={COLLECTION_NAME_MAX}
              placeholder={t("namePlaceholder")}
              data-collection-name=""
              className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy || name.trim().length === 0}
            className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
          >
            {busy ? t("working") : t("create")}
          </button>
        </form>
      )}

      {collections.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("hint")}</p>
      ) : null}

      {active ? (
        <div className="mt-5 rounded-[1.25rem] bg-paper/70 px-4 py-4">
          {renaming ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!renameValue.trim() || busy) return;
                onRename(active.id, renameValue);
                setRenaming(false);
              }}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("nameLabel")}</span>
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  maxLength={COLLECTION_NAME_MAX}
                  className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                disabled={busy || renameValue.trim().length === 0}
                className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
              >
                {t("renameSave")}
              </button>
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className="rounded-full px-3 py-2 text-sm text-muted"
              >
                {t("cancel")}
              </button>
            </form>
          ) : confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted">{t("deleteConfirm")}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onDelete(active.id);
                  setConfirmingDelete(false);
                }}
                className="rounded-full bg-blush px-4 py-2 text-sm shadow-card disabled:opacity-60"
              >
                {t("deleteYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full px-3 py-2 text-sm text-muted"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameValue(active.name);
                  setRenaming(true);
                }}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted"
              >
                {t("rename")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted"
              >
                {t("delete")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div
        className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4"
        data-collections-export="download"
      >
        <p className="max-w-sm text-sm leading-relaxed text-muted">{t("exportBody")}</p>
        <a
          href="/api/wall/collections/export"
          download="soft-boring-collections.json"
          className="inline-flex min-h-11 items-center rounded-full bg-paper px-4 py-2 text-sm shadow-card"
        >
          {t("exportCta")}
        </a>
      </div>

      {notice ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {t(
            notice === "full"
              ? "full"
              : notice === "duplicate"
                ? "duplicate"
                : notice === "invalid"
                  ? "invalid"
                  : notice === "not_saved"
                    ? "notSaved"
                    : "error",
          )}
        </p>
      ) : null}
    </section>
  );
}

export function CollectionMembership({
  collections,
  noteId,
  busyKey,
  onToggle,
}: {
  collections: WallCollection[];
  noteId: string;
  busyKey: string | null;
  onToggle: (collectionId: string, noteId: string, include: boolean) => void;
}) {
  const t = useTranslations("WallCollections");
  if (collections.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label={t("membershipLabel")}>
      {collections.map((collection) => {
        const on = collection.noteIds.includes(noteId);
        const key = `${collection.id}:${noteId}`;
        return (
          <button
            key={collection.id}
            type="button"
            aria-pressed={on}
            data-collection-member={collection.id}
            disabled={busyKey === key}
            onClick={() => onToggle(collection.id, noteId, !on)}
            className={
              on
                ? "rounded-full bg-paper px-3 py-1 text-xs shadow-card disabled:opacity-60"
                : "rounded-full border border-line bg-paper/40 px-3 py-1 text-xs text-muted disabled:opacity-60"
            }
          >
            {on ? t("inCollection", { name: collection.name }) : t("addTo", { name: collection.name })}
          </button>
        );
      })}
    </div>
  );
}
