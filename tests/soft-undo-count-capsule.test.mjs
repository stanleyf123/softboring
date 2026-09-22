import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { ensureSoftCapsules } = await import("../src/db/migrate.ts");
const {
  BOOKMARK_UNDO_MS,
  beginBookmarkUndo,
  bookmarkUndoLabel,
  bookmarkUndoOpen,
  bookmarkUndoRemaining,
} = await import("../src/lib/bookmark-undo.ts");
const {
  CAPSULE_CAP,
  CAPSULE_MAX,
  CAPSULE_MAX_DAYS,
  capsuleDateBounds,
  capsuleIsOpen,
  parseCapsuleBody,
  parseUnlockOn,
  sortPublicCapsules,
  toPublicCapsule,
} = await import("../src/lib/soft-capsule.ts");
const {
  SOFT_COUNT_STORAGE_KEY,
  countSoftParts,
  countSoftText,
  readSoftCountEnabled,
  softCountEnabledFromStorage,
  writeSoftCountEnabled,
} = await import("../src/lib/soft-word-count.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function flatKeys(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) return flatKeys(child, next);
    return [next];
  });
}

test("lifting a bookmark waits on a short local timer", () => {
  assert.equal(BOOKMARK_UNDO_MS >= 4000 && BOOKMARK_UNDO_MS <= 8000, true);
  const pending = beginBookmarkUndo("  note-1  ", 1_000);
  assert.equal(pending?.noteId, "note-1");
  assert.equal(pending?.expiresAt, 1_000 + BOOKMARK_UNDO_MS);
  assert.equal(bookmarkUndoOpen(pending, 1_000 + BOOKMARK_UNDO_MS - 1), true);
  assert.equal(bookmarkUndoOpen(pending, 1_000 + BOOKMARK_UNDO_MS), false);
  assert.equal(bookmarkUndoRemaining(pending, 1_500), BOOKMARK_UNDO_MS - 500);
  assert.equal(bookmarkUndoRemaining(pending, pending.expiresAt), 0);
  assert.equal(beginBookmarkUndo("   ", 1_000), null);
  assert.equal(beginBookmarkUndo("note", Number.NaN), null);
  assert.equal(bookmarkUndoOpen(null, 1), false);

  assert.equal(bookmarkUndoLabel("  warm   tea ", "quiet"), "warm tea");
  assert.equal(bookmarkUndoLabel("   ", "quiet note"), "quiet note");
  const long = "字".repeat(90);
  const label = bookmarkUndoLabel(long, "quiet");
  assert.equal(Array.from(label).length, 80);
  assert.equal(label.endsWith("…"), true);

  const saved = read("src/components/wall-saved-panel.tsx");
  const unsaveStart = saved.indexOf("function unsave");
  const unsaveEnd = saved.indexOf("async function createCollection");
  const unsave = saved.slice(unsaveStart, unsaveEnd);
  assert.match(unsave, /bookmarkUndo\.begin/);
  assert.doesNotMatch(unsave, /fetch\(/);
  assert.match(saved, /commitRemovedBookmark/);
  assert.match(saved, /BookmarkUndoToast/);
  assert.match(saved, /data-bookmark-undo|BookmarkUndoToast/);

  const board = read("src/components/wall-board.tsx");
  const marked = board.indexOf("if (note.bookmarked)");
  const flush = board.indexOf("bookmarkUndo.flush()", marked);
  const branch = board.slice(marked, flush);
  assert.match(branch, /bookmarkUndo\.begin/);
  assert.doesNotMatch(branch, /fetch\(/);
  assert.match(board, /BookmarkUndoToast/);
  assert.match(board, /commitUnbookmark/);
  assert.match(read("src/components/bookmark-undo-toast.tsx"), /BOOKMARK_UNDO_MS/);
  assert.match(read("src/app/globals.css"), /\.soft-undo-toast/);
  assert.doesNotMatch(read("src/components/bookmark-undo-toast.tsx"), /softPlus|sendMail|stripe|resend/i);
});

test("the review count is quiet, optional, and not a score", () => {
  assert.deepEqual(countSoftText(""), { words: 0, characters: 0 });
  assert.deepEqual(countSoftText("   \n  "), { words: 0, characters: 0 });
  assert.deepEqual(countSoftText("hello world"), { words: 2, characters: 10 });
  assert.deepEqual(countSoftText("hello 你好"), { words: 3, characters: 7 });
  assert.deepEqual(countSoftText("こんにちは"), { words: 5, characters: 5 });
  assert.deepEqual(countSoftText("Soft 週"), { words: 2, characters: 5 });
  assert.deepEqual(countSoftText("— …"), { words: 0, characters: 2 });
  assert.deepEqual(countSoftText("12 cats"), { words: 2, characters: 6 });
  assert.deepEqual(countSoftParts(["warm tea", 12, "  ", "謝"]), { words: 3, characters: 8 });

  assert.equal(softCountEnabledFromStorage(null), false);
  assert.equal(softCountEnabledFromStorage("true"), false);
  assert.equal(softCountEnabledFromStorage("1"), true);
  const bag = new Map();
  const storage = {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value),
    removeItem: (key) => bag.delete(key),
  };
  assert.equal(readSoftCountEnabled(storage), false);
  writeSoftCountEnabled(true, storage);
  assert.equal(bag.get(SOFT_COUNT_STORAGE_KEY), "1");
  assert.equal(readSoftCountEnabled(storage), true);
  writeSoftCountEnabled(false, storage);
  assert.equal(readSoftCountEnabled(storage), false);

  const counter = read("src/components/soft-word-count.tsx");
  const form = read("src/components/review-form.tsx");
  assert.match(form, /SoftWordCount/);
  assert.match(counter, /data-soft-count=/);
  assert.match(counter, /softCountHint/);
  assert.doesNotMatch(counter, /softPlus|sendMail|stripe|resend/i);
  assert.doesNotMatch(read("src/lib/soft-word-count.ts"), /softPlus/);
  assert.match(readJson("messages/en.json").Review.softCountHint, /No goal, no score/);
});

test("a capsule date is a future local midnight, and sealed notes hide their words", () => {
  assert.equal(CAPSULE_MAX, 280);
  assert.equal(CAPSULE_CAP, 24);
  const now = new Date("2026-09-22T15:00:00.000Z");
  assert.equal(parseCapsuleBody("  warm\ntea  "), "warm\ntea");
  assert.equal(parseCapsuleBody("   "), null);
  assert.equal(parseCapsuleBody(4), null);
  assert.equal(Array.from(parseCapsuleBody("謝".repeat(300))).length, 280);

  const bounds = capsuleDateBounds(now, "Asia/Taipei");
  assert.equal(bounds.minUnlockOn, "2026-09-23");
  assert.equal(bounds.timeZone, "Asia/Taipei");
  const unlockAt = parseUnlockOn("2026-09-23", now, "Asia/Taipei");
  assert.equal(unlockAt, "2026-09-22T16:00:00.000Z");
  assert.equal(parseUnlockOn("2026-09-22", now, "Asia/Taipei"), null);
  assert.equal(parseUnlockOn("2026-02-31", now, "Asia/Taipei"), null);
  assert.equal(parseUnlockOn("2026-9-23", now, "Asia/Taipei"), null);
  assert.equal(parseUnlockOn(bounds.maxUnlockOn, now, "Asia/Taipei") != null, true);
  const pastMax = bounds.maxUnlockOn.replace("2031", "2032");
  assert.equal(pastMax > bounds.maxUnlockOn, true);
  assert.equal(parseUnlockOn("2099-01-01", now, "Asia/Taipei"), null);
  assert.equal(CAPSULE_MAX_DAYS, 365 * 5);

  assert.equal(capsuleIsOpen(unlockAt, new Date("2026-09-22T15:59:59.000Z")), false);
  assert.equal(capsuleIsOpen(unlockAt, new Date(unlockAt)), true);
  assert.equal(capsuleIsOpen("not-a-date", now), false);

  const secret = {
    id: "cap-1",
    body: "secret tea",
    unlockAt,
    createdAt: "2026-09-22T15:00:00.000Z",
  };
  const sealed = toPublicCapsule(secret, now);
  assert.equal(sealed.sealed, true);
  assert.equal(Object.hasOwn(sealed, "body"), false);
  assert.equal(JSON.stringify(sealed).includes("secret"), false);
  const open = toPublicCapsule(secret, new Date(unlockAt));
  assert.equal(open.sealed, false);
  assert.equal(open.body, "secret tea");

  const ordered = sortPublicCapsules([
    { id: "later", createdAt: "2026-09-01T00:00:00.000Z", unlockAt: "2026-12-01T00:00:00.000Z", sealed: true },
    { id: "ready", createdAt: "2026-09-02T00:00:00.000Z", unlockAt: "2026-09-01T00:00:00.000Z", sealed: false, body: "hi" },
    { id: "sooner", createdAt: "2026-09-03T00:00:00.000Z", unlockAt: "2026-10-01T00:00:00.000Z", sealed: true },
  ]);
  assert.deepEqual(ordered.map((item) => item.id), ["ready", "sooner", "later"]);
});

test("old desks gain a private capsule table, and words stay sealed until unlock_at", async () => {
  const memory = new Database(":memory:");
  ensureSoftCapsules(memory);
  ensureSoftCapsules(memory);
  const table = memory
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'soft_capsules'`)
    .get();
  assert.equal(table.name, "soft_capsules");
  const columns = memory.prepare(`PRAGMA table_info(soft_capsules)`).all().map((col) => col.name);
  assert.ok(columns.includes("unlock_at"));
  memory.close();

  assert.match(read("scripts/schema.sql"), /CREATE TABLE IF NOT EXISTS soft_capsules/);
  assert.match(read("scripts/schema.sql"), /unlock_at TEXT NOT NULL/);
  assert.match(read("scripts/migrate.mjs"), /soft_capsules/);
  assert.match(read("src/db/migrate.ts"), /ensureSoftCapsules/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-capsule-"));
  const previousPath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "test.sqlite");
  if (globalThis.__softboringSqlite) {
    globalThis.__softboringSqlite.close();
    delete globalThis.__softboringSqlite;
  }

  try {
    const { sealCapsule, listPublicCapsules, deleteCapsule } = await import(
      "../src/db/soft-capsules.ts"
    );
    const { getDb } = await import("../src/db/client.ts");
    const db = getDb();
    const now = new Date("2026-09-22T15:00:00.000Z");
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at)
       VALUES ('member', 'capsule@example.com', 'x', '2026-09-22T00:00:00.000Z')`,
    ).run();

    const today = sealCapsule("member", "too soon", "2026-09-22", now);
    assert.equal(today.ok, false);
    assert.equal(today.reason, "date");
    const empty = sealCapsule("member", "   ", "2026-09-23", now);
    assert.equal(empty.ok, false);
    assert.equal(empty.reason, "invalid");

    const sealed = sealCapsule("member", "secret tea", "2026-09-23", now);
    assert.equal(sealed.ok, true);
    assert.equal(sealed.capsule.sealed, true);
    assert.equal(Object.hasOwn(sealed.capsule, "body"), false);
    assert.equal(JSON.stringify(sealed.capsule).includes("secret"), false);

    const hidden = listPublicCapsules("member", now);
    assert.equal(hidden.length, 1);
    assert.equal(hidden[0].sealed, true);
    assert.equal(Object.hasOwn(hidden[0], "body"), false);

    const visible = listPublicCapsules("member", new Date("2026-09-22T16:00:00.000Z"));
    assert.equal(visible[0].sealed, false);
    assert.equal(visible[0].body, "secret tea");

    for (let index = hidden.length; index < CAPSULE_CAP; index += 1) {
      const extra = sealCapsule("member", `line ${index}`, "2026-09-24", now);
      assert.equal(extra.ok, true);
    }
    const full = sealCapsule("member", "one more", "2026-09-24", now);
    assert.equal(full.ok, false);
    assert.equal(full.reason, "full");

    assert.equal(deleteCapsule("member", sealed.capsule.id), true);
    const again = sealCapsule("member", "after a space", "2026-09-25", now);
    assert.equal(again.ok, true);

    db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM soft_capsules`).get().n, 0);
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

test("capsule copy, Soft+ gate, and locales stay in step", () => {
  const route = read("src/app/api/soft-capsules/route.ts");
  const card = read("src/components/soft-capsule-card.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  assert.match(route, /userIsSoftPlus/);
  assert.match(route, /soft_plus_required/);
  assert.match(route, /unlockOn/);
  assert.doesNotMatch(route, /sendMail|stripe|resend|nodemailer|createTransport/i);
  assert.doesNotMatch(read("src/db/soft-capsules.ts"), /sendMail|stripe|resend|nodemailer/i);
  assert.match(read("src/app/[locale]/page.tsx"), /SoftCapsuleCard/);
  assert.match(read("src/components/account-panel.tsx"), /SoftCapsuleCard/);
  assert.match(pricing, /featureCapsuleFree/);
  assert.match(pricing, /featureCapsulePlus/);
  assert.match(pricing, /featureSoftCount/);

  const sealedAt = card.indexOf('data-soft-capsule="sealed"');
  const openAt = card.indexOf('data-soft-capsule="open"');
  assert.ok(sealedAt > 0 && openAt > sealedAt);
  assert.doesNotMatch(card.slice(sealedAt, openAt), /capsule\.body/);
  assert.match(card.slice(openAt), /capsule\.body/);
  assert.match(card, /data-soft-capsule="tease"/);

  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  const keys = locales.map((messages) => flatKeys(messages).sort());
  assert.deepEqual(keys[1], keys[0]);
  assert.deepEqual(keys[2], keys[0]);
  assert.equal(locales[0].SoftCapsule.title, "Soft capsule");
  assert.equal(locales[1].SoftCapsule.title, "輕柔膠囊");
  assert.equal(locales[2].SoftCapsule.title, "やわらかカプセル");
  assert.equal(locales[1].BookmarkUndo.undo, "復原");
  assert.equal(locales[2].BookmarkUndo.undo, "元に戻す");
  assert.equal(typeof locales[0].Review.softCountLine, "string");
  assert.equal(locales[1].Pricing.featureCapsulePlus.includes("不寄信"), true);
  assert.equal(locales[2].Pricing.featureCapsulePlus.includes("メール"), true);
  assert.match(read("src/i18n/routing.ts"), /locales: \["en", "zh-tw", "ja"\]/);
});
