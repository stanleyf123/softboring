import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);
import { FREE_HISTORY_LIMIT } from "../src/lib/plan.ts";
import { portableReflections } from "../src/lib/reflection-export.ts";
import {
  accountDownloadBody,
  accountDownloadPayload,
} from "../src/lib/review-export.ts";
import {
  SOFT_CONTENT_SECURITY_POLICY,
  SOFT_PERMISSIONS_POLICY,
  softSecurityHeaders,
} from "../src/lib/security-headers.ts";
import {
  WALL_NOTE_PREVIEW_OPEN_SELECTOR,
  isWallNotePreviewOpen,
  softDialogShouldClose,
  wallEscapeAction,
} from "../src/lib/soft-escape.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function sampleReview(id, createdAt) {
  return {
    id,
    createdAt,
    energy: "tea",
    drain: "",
    lessOf: "",
    priorities: "",
    feeling: 3,
    summary: `week-${id}`,
    customAnswers: [],
    locale: "en",
  };
}

test("security headers are the same list on the wire and on guidelines", () => {
  const headers = softSecurityHeaders();
  assert.deepEqual(
    headers.map((header) => header.key),
    [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
    ],
  );
  assert.equal(headers[0].value, SOFT_CONTENT_SECURITY_POLICY);
  assert.match(SOFT_CONTENT_SECURITY_POLICY, /base-uri 'self'/);
  assert.match(SOFT_CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.match(SOFT_CONTENT_SECURITY_POLICY, /frame-ancestors 'self'/);
  assert.doesNotMatch(SOFT_CONTENT_SECURITY_POLICY, /unsafe-eval|stripe|script-src/i);
  assert.equal(headers.find((header) => header.key === "X-Content-Type-Options")?.value, "nosniff");
  assert.equal(
    headers.find((header) => header.key === "Referrer-Policy")?.value,
    "strict-origin-when-cross-origin",
  );
  assert.equal(headers.find((header) => header.key === "X-Frame-Options")?.value, "SAMEORIGIN");
  assert.equal(headers.find((header) => header.key === "Permissions-Policy")?.value, SOFT_PERMISSIONS_POLICY);
  assert.match(SOFT_PERMISSIONS_POLICY, /camera=\(\)/);
  assert.match(SOFT_PERMISSIONS_POLICY, /microphone=\(\)/);
  assert.match(SOFT_PERMISSIONS_POLICY, /geolocation=\(\)/);

  const config = read("next.config.ts");
  assert.match(config, /softSecurityHeaders\(\)/);
  assert.match(config, /source: "\/:path\*"/);
  assert.match(config, /source: "\/sw\.js"/);

  const note = read("src/components/soft-security-note.tsx");
  assert.match(note, /softSecurityHeaders\(\)/);
  assert.match(note, /data-soft-security/);
  assert.match(note, /data-security-header=\{header\.key\}/);
  assert.match(note, /id="quiet-headers"/);
  assert.match(note, /href="\/privacy"/);
  assert.doesNotMatch(note, /stripe|nodemailer|resend|smtp/i);

  const legal = read("src/components/legal-page.tsx");
  assert.match(legal, /namespace === "Guidelines" \?/);
  assert.match(legal, /<SoftSecurityNote \/>/);
  assert.match(legal, /href="\/terms"/);
  assert.match(read("src/app/[locale]/guidelines/page.tsx"), /path: "\/guidelines"/);

  const footer = read("src/components/site-footer.tsx");
  const guidelines = footer.indexOf('href="/guidelines"');
  const privacy = footer.indexOf('href="/privacy"');
  const terms = footer.indexOf('href="/terms"');
  assert.ok(guidelines > 0 && guidelines < privacy && privacy < terms);

  for (const locale of ["en", "zh-tw", "ja"]) {
    const copy = readJson(`messages/${locale}.json`).Guidelines;
    assert.equal(typeof copy.securityTitle, "string");
    assert.equal(typeof copy.securityLead, "string");
    assert.equal(typeof copy.securityListLabel, "string");
    assert.equal(typeof copy.privacyLink, "string");
    assert.doesNotMatch(`${copy.securityLead} ${copy.privacyLink}`, /\/zh-TW(\/|$)/);
    assert.match(readJson(`messages/${locale}.json`).Privacy.s6Body, /JSON/);
  }
  assert.match(readJson("messages/zh-tw.json").Guidelines.securityTitle, /標頭/);
  assert.match(readJson("messages/ja.json").Guidelines.securityTitle, /ヘッダー/);
  assert.match(readJson("messages/zh-tw.json").Privacy.s6Body, /柔軟清單/);
});

test("Escape folds an open wall note and closes soft dialogs that were missing it", () => {
  assert.equal(
    wallEscapeAction({
      key: "Escape",
      dialogOpen: true,
      typing: true,
      previewOpen: true,
    }),
    "close-dialog",
  );
  assert.equal(
    wallEscapeAction({
      key: "Escape",
      dialogOpen: false,
      typing: false,
      previewOpen: true,
    }),
    "rest-preview",
  );
  assert.equal(
    wallEscapeAction({
      key: "Escape",
      dialogOpen: false,
      typing: true,
      previewOpen: true,
    }),
    null,
  );
  assert.equal(
    wallEscapeAction({
      key: "Escape",
      repeat: true,
      dialogOpen: false,
      typing: false,
      previewOpen: true,
    }),
    null,
  );
  assert.equal(
    wallEscapeAction({
      key: "Enter",
      dialogOpen: true,
      typing: false,
      previewOpen: true,
    }),
    null,
  );

  const openRoot = { querySelector: (selector) => (selector === WALL_NOTE_PREVIEW_OPEN_SELECTOR ? {} : null) };
  const shutRoot = { querySelector: () => null };
  assert.equal(isWallNotePreviewOpen(openRoot), true);
  assert.equal(isWallNotePreviewOpen(shutRoot), false);
  assert.equal(isWallNotePreviewOpen(null), false);

  assert.equal(softDialogShouldClose({ key: "Escape", open: true, modalOpen: false }), true);
  assert.equal(softDialogShouldClose({ key: "Escape", open: true, modalOpen: true }), false);
  assert.equal(softDialogShouldClose({ key: "Escape", open: false, modalOpen: false }), false);
  assert.equal(softDialogShouldClose({ key: "Escape", repeat: true, open: true, modalOpen: false }), false);

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /wallEscapeAction/);
  assert.match(board, /isWallNotePreviewOpen\(document\)/);
  assert.match(board, /data-note-preview-rest=\{previewRest \? "1" : "0"\}/);
  assert.match(board, /onPointerLeave=\{\(\) => setPreviewRest\(false\)\}/);
  assert.match(board, /role='dialog'/);
  assert.match(board, /data-note-preview=\{full && !locked \? "soft" : undefined\}/);

  const css = read("src/app/globals.css");
  assert.match(css, /data-note-preview-rest="1"/);
  assert.match(css, /-webkit-line-clamp:\s*5 !important/);
  const still = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(still, /The note preview still opens/);

  const bell = read("src/components/notification-bell.tsx");
  assert.match(bell, /softDialogShouldClose/);
  assert.match(bell, /aria-modal/);
  assert.match(bell, /role="dialog"/);

  assert.match(readJson("messages/en.json").Shortcuts.escape, /sticky|note/i);
  assert.match(readJson("messages/zh-tw.json").Shortcuts.escape, /便利貼/);
  assert.match(readJson("messages/ja.json").Shortcuts.escape, /付箋/);
});

test("Soft+ weekly JSON includes checklist marks and Free does not", () => {
  const reflections = [
    {
      weekKey: "2026-W10",
      checks: { noticed: true, unfinished: false, kind: false },
      updatedAt: "2026-03-02T00:00:00.000Z",
    },
    {
      weekKey: "2026-W12",
      checks: { noticed: false, unfinished: true, kind: true },
      updatedAt: "2026-03-16T00:00:00.000Z",
    },
    {
      weekKey: "2026-W11",
      checks: { noticed: "yes", unfinished: false, kind: false },
      updatedAt: "2026-03-09T00:00:00.000Z",
    },
    {
      weekKey: "nope",
      checks: { noticed: true, unfinished: true, kind: true },
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      weekKey: "2026-W09",
      checks: { noticed: false, unfinished: false, kind: false },
      updatedAt: "2026-03-01T00:00:00.000Z",
      email: "secret@example.com",
    },
  ];

  assert.equal(portableReflections(reflections, false), null);
  const plus = portableReflections(reflections, true);
  assert.deepEqual(
    plus.map((row) => row.weekKey),
    ["2026-W12", "2026-W10", "2026-W09"],
  );
  assert.equal(plus[0].checks.kind, true);
  assert.equal("email" in plus[2], false);

  const reviews = [
    sampleReview("old", "2026-01-01T00:00:00.000Z"),
    sampleReview("new", "2026-06-01T00:00:00.000Z"),
    sampleReview("mid", "2026-03-01T00:00:00.000Z"),
    sampleReview("newer", "2026-04-01T00:00:00.000Z"),
    sampleReview("newest", "2026-07-01T00:00:00.000Z"),
  ];
  const free = accountDownloadPayload(
    reviews,
    false,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
    reflections,
  );
  assert.equal("reflections" in free, false);
  assert.equal(free.included, 4);
  const freeBody = accountDownloadBody(
    reviews,
    false,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
    reflections,
  );
  assert.doesNotMatch(freeBody, /reflections|secret@example.com|2026-W12/);

  const plusPayload = accountDownloadPayload(
    reviews,
    true,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
    reflections,
  );
  assert.equal(plusPayload.plan, "soft_plus");
  assert.equal(plusPayload.reflections.length, 3);
  assert.equal(plusPayload.reflections[0].weekKey, "2026-W12");
  assert.equal(plusPayload.included, 5);
  const plusBody = accountDownloadBody(
    reviews,
    true,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
    reflections,
  );
  assert.match(plusBody, /"reflections"/);
  assert.doesNotMatch(plusBody, /secret@example.com/);

  const route = read("src/app/api/account/export/route.ts");
  assert.match(route, /listSoftReflectionsForUser/);
  assert.match(route, /access\.softPlus && access\.user/);
  assert.match(route, /requireUser/);
  assert.doesNotMatch(route, /stripe|nodemailer|resend|smtp/i);

  const card = read("src/components/soft-reflection-card.tsx");
  assert.match(card, /data-reflection-export="tease"/);
  assert.match(card, /data-reflection-export="download"/);
  assert.match(card, /href="\/api\/account\/export"/);
  assert.match(card, /if \(!softPlus\)/);

  const history = read("src/components/history-list.tsx");
  assert.match(history, /reflectionTease/);
  assert.match(history, /exportJson/);
  assert.match(history, /data-reflection-export="download"/);
  assert.match(history, /href="\/api\/reviews\/export"/);

  const db = read("src/db/soft-reflections.ts");
  assert.match(db, /export function listSoftReflectionsForUser/);
  assert.match(db, /ORDER BY week_key DESC/);
  assert.doesNotMatch(db.slice(db.indexOf("export function listSoftReflectionsForUser")), /email/);

  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(typeof messages.SoftReflection.exportTease, "string");
    assert.equal(typeof messages.SoftReflection.exportCta, "string");
    assert.equal(typeof messages.History.reflectionTease, "string");
    assert.equal(typeof messages.History.exportJson, "string");
    assert.match(messages.Pricing.featureReflectionPlus, /JSON/);
    assert.match(messages.Account.dataDownloadBody, /Soft\+/);
    assert.doesNotMatch(messages.SoftReflection.exportTease, /\/zh-TW(\/|$)/);
  }
  assert.match(readJson("messages/zh-tw.json").SoftReflection.exportCta, /JSON/);
  assert.match(readJson("messages/ja.json").History.exportJsonHint, /メールは送りません/);
});

test("reflection rows for export stay newest-week-first and leave with the member", async () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-reflection-export-"));
  const previousPath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "test.sqlite");
  if (globalThis.__softboringSqlite) {
    globalThis.__softboringSqlite.close();
    delete globalThis.__softboringSqlite;
  }

  try {
    const { getDb } = await import("../src/db/client.ts");
    const { listSoftReflectionsForUser, saveSoftReflectionForWeek } = await import(
      "../src/db/soft-reflections.ts"
    );
    const db = getDb();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at)
       VALUES ('member', 'marks@example.com', 'x', '2026-09-22T00:00:00.000Z')`,
    ).run();
    saveSoftReflectionForWeek({
      userId: "member",
      weekKey: "2026-W10",
      checks: { noticed: true, unfinished: false, kind: false },
      now: new Date("2026-03-02T00:00:00.000Z"),
    });
    saveSoftReflectionForWeek({
      userId: "member",
      weekKey: "2026-W12",
      checks: { noticed: false, unfinished: false, kind: true },
      now: new Date("2026-03-16T00:00:00.000Z"),
    });
    const listed = listSoftReflectionsForUser("member");
    assert.deepEqual(
      listed.map((row) => row.weekKey),
      ["2026-W12", "2026-W10"],
    );
    assert.equal(listed[0].checks.kind, true);
    db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
    assert.equal(listSoftReflectionsForUser("member").length, 0);
  } finally {
    const live = globalThis.__softboringSqlite;
    if (live) {
      live.close();
      delete globalThis.__softboringSqlite;
    }
    if (previousPath === undefined) delete process.env.SQLITE_PATH;
    else process.env.SQLITE_PATH = previousPath;
    rmSync(dir, { recursive: true, force: true });
  }
});
