import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromEnv = process.env.SQLITE_PATH?.trim();
const configured =
  fromEnv && fromEnv.length > 0 ? fromEnv : "./data/softboring.sqlite";
const sqlitePath = isAbsolute(configured)
  ? configured
  : resolve(process.cwd(), configured);

mkdirSync(dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
db.close();

console.log(`SQLite ready at ${sqlitePath}`);
