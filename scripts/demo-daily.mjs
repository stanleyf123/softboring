import {
  openSqlite,
  postDailyDemoNotes,
  resolveSqlitePath,
} from "./lib/demo-bots.mjs";

function printUsage() {
  console.log(`Usage:
  npm run demo:daily             Post today's rotating Soft Wall notes (Asia/Taipei)

Environment:
  SQLITE_PATH       SQLite file (default ./data/softboring.sqlite)

Safe to run twice the same Taipei calendar day: extra runs skip.
Run npm run demo:seed once before installing cron.
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const sqlitePath = resolveSqlitePath();
  const db = openSqlite(sqlitePath);
  try {
    const result = postDailyDemoNotes(db);
    console.log(`demo:daily: sqlite ${sqlitePath}`);
    console.log(`demo:daily: Taipei day ${result.dateKey}`);
    console.log(`demo:daily: selected ${result.selected.join(", ") || "(none)"}`);
    console.log(
      `demo:daily: posted ${result.posted}, skipped ${result.skipped}, missing ${result.missing}`,
    );
    if (result.missing > 0 && result.posted === 0) {
      console.log("demo:daily: no demo users found; run npm run demo:seed first.");
    }
  } finally {
    db.close();
  }
}

main();
