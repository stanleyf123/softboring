"use client";

import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("Notifications");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(unreadCount);
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

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-full px-2.5 py-1 hover:text-foreground"
        aria-expanded={open}
        aria-label={t("label")}
      >
        {t("bell")}
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-paper">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] bg-paper p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg tracking-tight">{t("title")}</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-muted hover:text-foreground"
              >
                {t("markAll")}
              </button>
            ) : null}
          </div>
          {!items ? (
            <p className="mt-3 text-sm text-muted">{t("loading")}</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href === "/wall" ? "/wall" : "/account"}
                    onClick={() => {
                      if (!item.readAt) void markOne(item.id);
                      setOpen(false);
                    }}
                    className={`block rounded-2xl px-3 py-2 text-sm ${
                      item.readAt ? "bg-cream/70" : "bg-peach/70"
                    }`}
                  >
                    <p className="font-display">
                      {item.kind === "wall_comment" ? t("wallComment") : item.title}
                    </p>
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
