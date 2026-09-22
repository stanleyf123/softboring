"use client";

import { SoftTipsList } from "@/components/soft-tips-card";
import { Link } from "@/i18n/navigation";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type InboxFilter = "all" | "unread" | "tips";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("Notifications");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(unreadCount);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notifications: Item[] };
    setItems(data.notifications);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
    }
  }

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    setUnread(0);
    setItems((current) =>
      current
        ? current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))
        : current,
    );
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "PATCH" });
    setItems((current) =>
      current
        ? current.map((item) =>
            item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
          )
        : current,
    );
    setUnread((count) => Math.max(0, count - 1));
  }

  function titleFor(item: Item) {
    if (item.kind === "wall_reply") return t("wallReply");
    if (item.kind === "wall_comment") return t("wallComment");
    return item.title;
  }

  const visibleItems = useMemo(() => {
    if (!items) return null;
    if (filter === "unread") return items.filter((item) => !item.readAt);
    return items;
  }, [items, filter]);

  const filters: Array<{ id: InboxFilter; label: string }> = [
    { id: "all", label: t("filterAll") },
    { id: "unread", label: t("filterUnread") },
    { id: "tips", label: t("filterTips") },
  ];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`${SOFT_CHROME_FOCUS} relative grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-peach/70 hover:text-foreground`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("label")}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] bg-paper p-4 shadow-soft"
          role="dialog"
          aria-label={t("title")}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg tracking-tight">{t("title")}</p>
            {unread > 0 && filter !== "tips" ? (
              <button
                type="button"
                onClick={markAll}
                className={`${SOFT_CHROME_FOCUS} min-h-11 rounded-full px-2 text-xs text-muted hover:text-foreground`}
              >
                {t("markAll")}
              </button>
            ) : null}
          </div>
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label={t("filterLabel")}
          >
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={
                  filter === item.id
                    ? `${SOFT_CHROME_FOCUS} rounded-full bg-peach px-3 py-1.5 text-xs text-foreground`
                    : `${SOFT_CHROME_FOCUS} rounded-full px-3 py-1.5 text-xs text-muted hover:bg-cream/80 hover:text-foreground`
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          {filter === "tips" ? (
            <div className="mt-3">
              <p className="text-sm text-muted">{t("tipsLead")}</p>
              <SoftTipsList limit={4} />
            </div>
          ) : !items ? (
            <p className="mt-3 text-sm text-muted">{t("loading")}</p>
          ) : visibleItems && visibleItems.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {filter === "unread" ? t("emptyUnread") : t("empty")}
            </p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
              {(visibleItems ?? []).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href === "/wall" ? "/wall" : "/account"}
                    onClick={() => {
                      if (!item.readAt) void markOne(item.id);
                      setOpen(false);
                    }}
                    className={`${SOFT_CHROME_FOCUS} block rounded-2xl px-3 py-2 text-sm ${
                      item.readAt ? "bg-cream/70" : "bg-peach/70"
                    }`}
                  >
                    <p className="font-display">{titleFor(item)}</p>
                    {item.body ? (
                      <p className="mt-1 line-clamp-2 text-muted">{item.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      {format.dateTime(new Date(item.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
