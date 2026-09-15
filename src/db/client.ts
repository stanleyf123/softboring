import Database from "better-sqlite3";
import { ensureSqliteDir, getSqlitePath } from "./path";
import { migrateDb } from "./migrate";

type GlobalDb = typeof globalThis & {
  __softboringSqlite?: Database.Database;
};

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
