import {
  DEFAULT_DEMO_PASSWORD,
  demoPassword,
  listDemoEmails,
  listDemoUserRows,
  openSqlite,
  purgeDemoAccounts,
  resolveSqlitePath,
  seedDemoAccounts,
} from "./lib/demo-bots.mjs";

function printUsage() {
  console.log(`Usage:
  npm run demo:seed              Seed 10 Soft+ demo accounts (idempotent)
  npm run demo:purge             Remove only @softboring.demo demo accounts

Environment:
  SQLITE_PATH       SQLite file (default ./data/softboring.sqlite)
  DEMO_PASSWORD     Shared demo password (default ${DEFAULT_DEMO_PASSWORD})

Demo emails:
  ${listDemoEmails().join(", ")}
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
    if (args.includes("--purge")) {
      const result = purgeDemoAccounts(db);
      console.log(
        `demo:seed --purge: deleted ${result.deleted} demo account(s) at ${sqlitePath}`,
      );
      return;
    }

    const result = seedDemoAccounts(db, { password: demoPassword() });
    const rows = listDemoUserRows(db);
    console.log(`demo:seed: sqlite ${sqlitePath}`);
    console.log(
      `demo:seed: created ${result.usersCreated}, updated ${result.usersUpdated}, reviews +${result.reviewsInserted}, wall notes +${result.wallNotesInserted}`,
    );
    for (const row of rows) {
      console.log(
        `  ${row.email}  nickname=${row.nickname ?? "(none)"}  plan=${row.plan} status=${row.plan_status} is_demo=${row.is_demo}`,
      );
    }
    console.log(`demo:seed: shared password is DEMO_PASSWORD (default ${DEFAULT_DEMO_PASSWORD})`);
  } finally {
    db.close();
  }
}

main();
