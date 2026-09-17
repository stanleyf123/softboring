import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 16;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

class NicknameError extends Error {
  constructor(code) {
    super(code);
    this.name = "NicknameError";
    this.code = code;
  }
}

function nicknameLength(value) {
  return Array.from(value).length;
}

function parseNickname(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new NicknameError("invalid_nickname");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (CONTROL_CHARS.test(trimmed)) {
    throw new NicknameError("invalid_nickname");
  }
  const length = nicknameLength(trimmed);
  if (length < NICKNAME_MIN) throw new NicknameError("nickname_too_short");
  if (length > NICKNAME_MAX) throw new NicknameError("nickname_too_long");
  return trimmed;
}

function wallOwnerNickname(nickname, email, { allowEmailFallback = true } = {}) {
  const nick = (nickname ?? "").trim();
  if (nick) return nick;
  if (allowEmailFallback === false) return null;
  const local = (email ?? "").split("@")[0]?.trim() ?? "";
  return local || null;
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

test("nickname validation: length, trim, empty clears, control chars", () => {
  assert.equal(parseNickname(null), null);
  assert.equal(parseNickname(""), null);
  assert.equal(parseNickname("   "), null);
  assert.equal(parseNickname("小桃"), "小桃");
  assert.equal(parseNickname("  薄荷糖  "), "薄荷糖");
  assert.equal(parseNickname("afternoon tea"), "afternoon tea");
  assert.throws(() => parseNickname("桃"), { code: "nickname_too_short" });
  assert.throws(() => parseNickname("abcdefghijklmnopq"), { code: "nickname_too_long" });
  assert.throws(() => parseNickname("no\npe"), { code: "invalid_nickname" });
  assert.throws(() => parseNickname(12), { code: "invalid_nickname" });
  assert.equal(nicknameLength("茶泡飯"), 3);
  assert.equal(nicknameLength("abcdefghijklmnop"), 16);
});

test("wall owner nickname is public identity; teasers skip email fallback", () => {
  assert.equal(wallOwnerNickname("小桃", "demo01@softboring.demo"), "小桃");
  assert.equal(wallOwnerNickname("  ", "peach@example.com"), "peach");
  assert.equal(
    wallOwnerNickname("", "peach@example.com", { allowEmailFallback: false }),
    null,
  );
  assert.equal(wallOwnerNickname(null, null), null);
});

test("existing users table gains nullable nickname via ALTER", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-nick-alter-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      plan_status TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("user-old", "old@example.com", "hash", "2026-01-01T00:00:00.000Z");
  db.exec("ALTER TABLE users ADD COLUMN nickname TEXT");
  const cols = columnNames(db, "users");
  assert.ok(cols.includes("nickname"));
  const row = db.prepare(`SELECT nickname FROM users WHERE id = ?`).get("user-old");
  assert.equal(row.nickname, null);
  db.prepare(`UPDATE users SET nickname = ? WHERE id = ?`).run("暖暖", "user-old");
  const updated = db.prepare(`SELECT nickname FROM users WHERE id = ?`).get("user-old");
  assert.equal(updated.nickname, "暖暖");
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("fresh schema.sql includes users.nickname", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-nick-schema-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
  assert.ok(columnNames(db, "users").includes("nickname"));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("account nickname API, UI, locales, and migration stay wired", () => {
  const nicknameLib = readFileSync(join(root, "src/lib/nickname.ts"), "utf8");
  const usersDb = readFileSync(join(root, "src/db/users.ts"), "utf8");
  const migrate = readFileSync(join(root, "src/db/migrate.ts"), "utf8");
  const migrateMjs = readFileSync(join(root, "scripts/migrate.mjs"), "utf8");
  const route = readFileSync(join(root, "src/app/api/account/nickname/route.ts"), "utf8");
  const panel = readFileSync(join(root, "src/components/account-panel.tsx"), "utf8");
  const accountPage = readFileSync(join(root, "src/app/[locale]/account/page.tsx"), "utf8");
  const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  const zh = JSON.parse(readFileSync(join(root, "messages/zh-tw.json"), "utf8"));

  assert.match(nicknameLib, /NICKNAME_MIN = 2/);
  assert.match(nicknameLib, /NICKNAME_MAX = 16/);
  assert.match(nicknameLib, /export function parseNickname/);
  assert.match(usersDb, /updateUserNickname/);
  assert.match(usersDb, /nickname/);
  assert.match(migrate, /ensureUserNicknameColumn/);
  assert.match(migrate, /nickname TEXT/);
  assert.match(migrateMjs, /ensureColumn\("users", "nickname"/);
  assert.match(route, /parseNickname/);
  assert.match(route, /PATCH/);
  assert.match(panel, /\/api\/account\/nickname/);
  assert.match(panel, /nicknameTitle/);
  assert.match(accountPage, /nickname=\{user\.nickname\}/);

  for (const messages of [en, zh]) {
    assert.ok(messages.Account.nicknameTitle.length > 2);
    assert.ok(messages.Account.nicknameSave.length > 2);
    assert.ok(messages.Wall.softVisitor.length > 2);
  }
  assert.equal(zh.Account.nicknameLabel, "小綽號");
  assert.equal(zh.Wall.softVisitor, "溫柔訪客");
  assert.match(en.Wall.softVisitor, /gentle visitor/i);
});
