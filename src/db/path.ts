import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const DEFAULT_SQLITE_PATH = "./data/softboring.sqlite";

export function getSqlitePath() {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  const configured = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_SQLITE_PATH;
  if (isAbsolute(configured)) return configured;
  return resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

export function ensureSqliteDir(sqlitePath: string) {
  mkdirSync(dirname(sqlitePath), { recursive: true });
}
