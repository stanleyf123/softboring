"use client";

import { EmptyState, ListSkeleton } from "@/components/empty-state";
import {
  CollectionMembership,
  WallCollectionsPanel,
  WallCollectionsTease,
  type CollectionNotice,
} from "@/components/wall-collections-panel";
import { Link } from "@/i18n/navigation";
import type { WallCollection } from "@/lib/wall-collections";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type SavedNote = {
  id: string;
  excerpt: string;
  summary: string;
  feeling: number | null;
  praiseCount: number;
  bookmarkedAt: string;
  ownerNickname?: string | null;
  ownerFallback?: string | null;
  color: string;
};

const COLOR_CLASS: Record<string, string> = {
  peach: "bg-peach/70",
  blush: "bg-blush/70",
  mint: "bg-mint/70",
  cream: "bg-cream/80",
  lemon: "bg-lemon/70",
  sky: "bg-sky/70",
};

function noticeFromError(error: string | undefined): CollectionNotice {
  if (error === "invalid_name") return "invalid";
  if (error === "full" || error === "duplicate" || error === "invalid" || error === "not_saved") {
    return error;
  }
  return "generic";
}

export function WallSavedPanel({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("WallSaved");
  const tCollections = useTranslations("WallCollections");
  const tWall = useTranslations("Wall");
  const format = useFormatter();
  const [notes, setNotes] = useState<SavedNote[] | null>(softPlus ? null : []);
  const [collections, setCollections] = useState<WallCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [error, setError] = useState<"locked" | "generic" | null>(softPlus ? null : "locked");
  const [notice, setNotice] = useState<CollectionNotice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collectionBusy, setCollectionBusy] = useState(false);

  useEffect(() => {
    if (!softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const [notesResponse, collectionsResponse] = await Promise.all([
          fetch("/api/wall/bookmarks", { cache: "no-store" }),
          fetch("/api/wall/collections", { cache: "no-store" }),
        ]);
        if (
          notesResponse.status === 401 ||
          notesResponse.status === 403 ||
          collectionsResponse.status === 401 ||
          collectionsResponse.status === 403
        ) {
          if (!cancelled) {
            setError("locked");
            setNotes([]);
            setCollections([]);
          }
          return;
        }
        if (!notesResponse.ok) throw new Error("failed");
        const data = (await notesResponse.json()) as { notes: SavedNote[] };
        const collectionData = collectionsResponse.ok
          ? ((await collectionsResponse.json()) as { collections: WallCollection[] })
          : { collections: [] as WallCollection[] };
        if (!cancelled) {
          setNotes(data.notes);
          setCollections(collectionData.collections);
          setNotice(collectionsResponse.ok ? null : "generic");
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("generic");
          setNotes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [softPlus]);

  const visibleNotes = useMemo(() => {
    if (!notes) return [];
    if (!activeCollectionId) return notes;
    const collection = collections.find((item) => item.id === activeCollectionId);
    if (!collection) return notes;
    const ids = new Set(collection.noteIds);
    return notes.filter((note) => ids.has(note.id));
  }, [notes, collections, activeCollectionId]);

  async function unsave(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(id)}/bookmark`, {
        method: "POST",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { bookmarked: boolean };
      if (!data.bookmarked) {
        setNotes((current) => (current ? current.filter((note) => note.id !== id) : current));
        setCollections((current) =>
          current.map((collection) => ({
            ...collection,
            noteIds: collection.noteIds.filter((noteId) => noteId !== id),
          })),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function createCollection(name: string) {
    if (collectionBusy) return;
    setCollectionBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/wall/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        collections?: WallCollection[];
        collection?: WallCollection;
      };
      if (!response.ok) {
        setNotice(noticeFromError(data.error));
        return;
      }
      if (data.collections) setCollections(data.collections);
      if (data.collection) setActiveCollectionId(data.collection.id);
    } catch {
      setNotice("generic");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function renameCollection(id: string, name: string) {
    if (collectionBusy) return;
    setCollectionBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/wall/collections/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        collections?: WallCollection[];
      };
      if (!response.ok) {
        setNotice(noticeFromError(data.error));
        return;
      }
      if (data.collections) setCollections(data.collections);
    } catch {
      setNotice("generic");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function deleteCollection(id: string) {
    if (collectionBusy) return;
    setCollectionBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/wall/collections/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        collections?: WallCollection[];
      };
      if (!response.ok) {
        setNotice(noticeFromError(data.error));
        return;
      }
      if (data.collections) setCollections(data.collections);
      setActiveCollectionId((current) => (current === id ? null : current));
    } catch {
      setNotice("generic");
    } finally {
      setCollectionBusy(false);
    }
  }

  async function toggleMembership(collectionId: string, noteId: string, include: boolean) {
    const key = `${collectionId}:${noteId}`;
    if (busyId) return;
    setBusyId(key);
    setNotice(null);
    const previous = collections;
    setCollections((current) =>
      current.map((collection) => {
        if (collection.id !== collectionId) return collection;
        const noteIds = include
          ? collection.noteIds.includes(noteId)
            ? collection.noteIds
            : [...collection.noteIds, noteId]
          : collection.noteIds.filter((id) => id !== noteId);
        return { ...collection, noteIds };
      }),
    );
    try {
      const response = await fetch(
        `/api/wall/collections/${encodeURIComponent(collectionId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId, include }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        collections?: WallCollection[];
      };
      if (!response.ok) {
        setCollections(previous);
        setNotice(noticeFromError(data.error));
        return;
      }
      if (data.collections) setCollections(data.collections);
    } catch {
      setCollections(previous);
      setNotice("generic");
    } finally {
      setBusyId(null);
    }
  }

  if (notes === null) {
    return <ListSkeleton label={t("loading")} />;
  }

  if (error === "locked") {
    return (
      <div className="space-y-6">
        <WallCollectionsTease />
        <EmptyState
          title={t("lockedTitle")}
          body={t("lockedBody")}
          ctaHref="/pricing"
          ctaLabel={t("lockedCta")}
          wash="bg-peach/40"
          illustration="saved"
        />
      </div>
    );
  }

  if (error === "generic") {
    return <EmptyState title={t("loadErrorTitle")} body={t("loadError")} illustration="saved" />;
  }

  const showSavedEmpty = notes.length === 0;
  const showCollectionEmpty = !showSavedEmpty && visibleNotes.length === 0;

  return (
    <div className="space-y-6">
      <WallCollectionsPanel
        collections={collections}
        activeId={activeCollectionId}
        busy={collectionBusy}
        notice={notice}
        onActive={setActiveCollectionId}
        onCreate={createCollection}
        onRename={renameCollection}
        onDelete={deleteCollection}
      />
      {showSavedEmpty ? (
        <EmptyState
          title={t("emptyTitle")}
          body={t("empty")}
          ctaHref="/wall"
          ctaLabel={t("emptyCta")}
          wash="bg-blush/40"
          illustration="saved"
        />
      ) : null}
      {showCollectionEmpty ? (
        <EmptyState
          title={tCollections("emptyCollectionTitle")}
          body={tCollections("emptyCollection")}
          wash="bg-cream"
          illustration="saved"
        />
      ) : null}
      {visibleNotes.length > 0 ? (
        <ul className="space-y-4">
          {visibleNotes.map((note) => {
            const wash = COLOR_CLASS[note.color] ?? "bg-peach/70";
            const author =
              note.ownerNickname?.trim() ||
              note.ownerFallback?.trim() ||
              tWall("softVisitor");
            return (
              <li
                key={note.id}
                className={`rounded-[1.75rem] ${wash} px-5 py-5 shadow-card sm:px-6`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">{t("byAuthor", { name: author })}</p>
                    <p className="mt-2 font-display text-xl tracking-tight">
                      {note.summary?.trim() || note.excerpt || tWall("untitled")}
                    </p>
                    {note.feeling != null ? (
                      <p className="mt-2 text-sm text-muted">
                        {tWall("feeling", { value: note.feeling })}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted">
                      {t("savedOn", {
                        date: format.dateTime(new Date(note.bookmarkedAt), {
                          dateStyle: "medium",
                        }),
                      })}
                    </p>
                    <CollectionMembership
                      collections={collections}
                      noteId={note.id}
                      busyKey={busyId}
                      onToggle={toggleMembership}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={{ pathname: "/wall", query: { note: note.id } }}
                      className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
                    >
                      {t("open")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => unsave(note.id)}
                      disabled={busyId === note.id}
                      className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60"
                    >
                      {busyId === note.id ? t("saving") : t("unsave")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
