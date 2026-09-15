import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureSqliteDir, getSqlitePath } from "./path";

type GlobalDb = typeof globalThis & {
  __softboringSqlite?: Database.Database;
};

function schemaSql() {
  return readFileSync(join(process.cwd(), "scripts/schema.sql"), "utf8");
}

export function migrateDb(db: Database.Database) {
  db.exec(schemaSql());
}

function openDatabase() {
  const sqlitePath = getSqlitePath();
  ensureSqliteDir(sqlitePath);

  const db = new Database(sqlitePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrateDb(db);
  return db;
}

export function getDb() {
  const globalDb = globalThis as GlobalDb;
  if (!globalDb.__softboringSqlite) {
    globalDb.__softboringSqlite = openDatabase();
  }
  return globalDb.__softboringSqlite;
}
