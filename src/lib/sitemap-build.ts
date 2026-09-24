import { routing } from "@/i18n/routing";
import { isShareId } from "@/lib/soft-copy-link";
import { hreflangLanguages, localizedPath, PUBLIC_SEO_PATHS } from "@/lib/seo";
import {
  isBlockedSitemapPath,
  sitemapChangeFrequency,
  sitemapPriority,
} from "@/lib/seo-index";
import type { MetadataRoute } from "next";

const DEFAULT_ORIGIN = "https://softboring.com";
const NOTE_LIMIT = 2000;

export type SitemapChangeFrequency = "weekly" | "monthly";

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
  alternates?: {
    languages?: Record<string, string>;
  };
};

/** A wall row may be partial. Only id, dates, and hidden are read. */
export type SitemapNoteInput = {
  id?: unknown;
  hidden?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
};

type LanguagesFor = (origin: string, path: string) => Record<string, string>;

function cleanOrigin(origin: unknown) {
  if (typeof origin !== "string") return DEFAULT_ORIGIN;
  const trimmed = origin.trim().replace(/\/+$/, "");
  if (/^https?:\/\/[^/\s]+$/i.test(trimmed)) return trimmed;
  return DEFAULT_ORIGIN;
}

function validDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    if (typeof value === "string" && value.trim() === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function noteLastModified(note: SitemapNoteInput, fallback: Date) {
  return (
    validDate(note.updatedAt) ??
    validDate(note.updated_at) ??
    validDate(note.createdAt) ??
    validDate(note.created_at) ??
    fallback
  );
}

function isHiddenNote(hidden: unknown) {
  return hidden === true || hidden === 1 || hidden === "1";
}

function notePath(note: SitemapNoteInput): string | null {
  if (!note || typeof note !== "object") return null;
  if (isHiddenNote(note.hidden)) return null;
  if (!isShareId(note.id)) return null;
  const path = `/wall?note=${encodeURIComponent(note.id)}`;
  if (path.includes("/og/note")) return null;
  if (isBlockedSitemapPath(path)) return null;
  return path;
}

function languagesForPath(origin: string, path: string, languagesFor: LanguagesFor) {
  try {
    const languages = languagesFor(origin, path);
    if (!languages || typeof languages !== "object") return undefined;
    const safe: Record<string, string> = {};
    for (const [tag, href] of Object.entries(languages)) {
      if (typeof tag !== "string" || typeof href !== "string") continue;
      if (!tag.trim() || !href.startsWith("http")) continue;
      safe[tag] = href;
    }
    return Object.keys(safe).length > 0 ? safe : undefined;
  } catch {
    return undefined;
  }
}

function pageEntry(
  origin: string,
  path: string,
  now: Date,
  languagesFor: LanguagesFor,
): SitemapEntry | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;
  if (isBlockedSitemapPath(path)) return null;
  const languages = languagesForPath(origin, path, languagesFor);
  return {
    url: `${origin}${localizedPath(routing.defaultLocale, path)}`,
    lastModified: now,
    changeFrequency: sitemapChangeFrequency(path),
    priority: sitemapPriority(path),
    ...(languages ? { alternates: { languages } } : {}),
  };
}

/**
 * Public pages plus optional Soft Wall notes.
 * Missing, empty, or partial note rows are skipped. This function does not throw.
 */
export function buildPublicSitemap({
  origin,
  paths = PUBLIC_SEO_PATHS,
  notes = [],
  now = new Date(),
  languagesFor = hreflangLanguages,
}: {
  origin?: unknown;
  paths?: readonly string[] | null;
  notes?: readonly SitemapNoteInput[] | null;
  now?: Date;
  languagesFor?: LanguagesFor;
} = {}): SitemapEntry[] {
  const safeOrigin = cleanOrigin(origin);
  const stamped = validDate(now) ?? new Date();
  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();

  const pagePaths = Array.isArray(paths) ? paths : PUBLIC_SEO_PATHS;
  for (const path of pagePaths) {
    try {
      const entry = pageEntry(safeOrigin, path, stamped, languagesFor);
      if (!entry || seen.has(entry.url)) continue;
      seen.add(entry.url);
      entries.push(entry);
    } catch {
      // One bad path must not drop digest, year, or the rest of the file.
    }
  }

  const rows = Array.isArray(notes) ? notes : [];
  let added = 0;
  for (const note of rows) {
    if (added >= NOTE_LIMIT) break;
    try {
      if (!note || typeof note !== "object") continue;
      const path = notePath(note);
      if (!path) continue;
      const languages = languagesForPath(safeOrigin, path, languagesFor);
      const url = `${safeOrigin}${localizedPath(routing.defaultLocale, path)}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({
        url,
        lastModified: noteLastModified(note, stamped),
        changeFrequency: "weekly",
        priority: 0.5,
        ...(languages ? { alternates: { languages } } : {}),
      });
      added += 1;
    } catch {
      // Partial row: keep going.
    }
  }

  if (entries.length === 0) {
    entries.push({
      url: `${safeOrigin}${localizedPath(routing.defaultLocale, "/")}`,
      lastModified: stamped,
      changeFrequency: "weekly",
      priority: 1,
    });
  }

  return entries;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sitemap XML. Invalid dates and bad alternates are omitted instead of throwing. */
export function renderSitemapXml(entries: readonly SitemapEntry[] | null | undefined) {
  const rows = Array.isArray(entries) ? entries : [];
  let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
  content +=
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const entry of rows) {
    try {
      if (!entry || typeof entry.url !== "string" || !entry.url.startsWith("http")) continue;
      content += "<url>\n";
      content += `<loc>${xmlEscape(entry.url)}</loc>\n`;
      const languages = entry.alternates?.languages;
      if (languages && typeof languages === "object") {
        for (const [tag, href] of Object.entries(languages)) {
          if (typeof href !== "string" || !href.startsWith("http")) continue;
          content += `<xhtml:link rel="alternate" hreflang="${xmlEscape(tag)}" href="${xmlEscape(href)}" />\n`;
        }
      }
      const lastModified = validDate(entry.lastModified);
      if (lastModified) {
        content += `<lastmod>${lastModified.toISOString()}</lastmod>\n`;
      }
      if (entry.changeFrequency === "weekly" || entry.changeFrequency === "monthly") {
        content += `<changefreq>${entry.changeFrequency}</changefreq>\n`;
      }
      if (typeof entry.priority === "number" && Number.isFinite(entry.priority)) {
        const priority = Math.min(1, Math.max(0, entry.priority));
        content += `<priority>${priority}</priority>\n`;
      }
      content += "</url>\n";
    } catch {
      // Skip this url and keep the document valid.
    }
  }

  content += "</urlset>\n";
  return content;
}

export function sitemapXmlFor(input: Parameters<typeof buildPublicSitemap>[0] = {}) {
  return renderSitemapXml(buildPublicSitemap(input));
}

/** Next's sitemap type, after dates are known to be valid. */
export function asMetadataSitemap(entries: readonly SitemapEntry[]): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: entry.url,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    ...(entry.changeFrequency ? { changeFrequency: entry.changeFrequency } : {}),
    ...(typeof entry.priority === "number" ? { priority: entry.priority } : {}),
    ...(entry.alternates?.languages
      ? { alternates: { languages: entry.alternates.languages } }
      : {}),
  }));
}
