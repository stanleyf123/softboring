import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const { groupHistoryByMonth, historyMonthKey, resolvedHistoryZone } = await import(
  "../src/lib/history-months.ts"
);
const { monthlyReportBars, reportBarWidth } = await import("../src/lib/soft-report.ts");
const { WEEK_PAUSE_ANCHOR, LEAVE_DESK_ANCHOR, deskEdgeLinks, leaveDeskPath, weekPausePath } =
  await import("../src/lib/desk-edges.ts");

test("history months follow the account clock and keep arrival order", () => {
  assert.equal(resolvedHistoryZone("Asia/Taipei", "Europe/London"), "Asia/Taipei");
  assert.equal(resolvedHistoryZone("", "Europe/London"), "Europe/London");
  assert.equal(resolvedHistoryZone("Not/AZone", null), "UTC");
  assert.equal(resolvedHistoryZone(null, null), "UTC");

  // 2026-03-31 16:00 UTC is already April 1 in Taipei.
  assert.equal(historyMonthKey("2026-03-31T16:00:00.000Z", "Asia/Taipei"), "2026-04");
  assert.equal(historyMonthKey("2026-03-31T16:00:00.000Z", "UTC"), "2026-03");
  assert.equal(historyMonthKey("not-a-date", "Asia/Taipei"), "undated");
  assert.equal(historyMonthKey("", "UTC"), "undated");

  const grouped = groupHistoryByMonth(
    [
      { id: "apr", createdAt: "2026-03-31T16:00:00.000Z" },
      { id: "mar", createdAt: "2026-03-15T04:00:00.000Z" },
      { id: "apr-later", createdAt: "2026-04-02T00:00:00.000Z" },
      { id: "blank", createdAt: "" },
      { id: "mar-earlier", createdAt: "2026-03-01T00:00:00.000Z" },
    ],
    "Asia/Taipei",
  );

  assert.deepEqual(
    grouped.map((group) => group.key),
    ["2026-04", "2026-03", "undated"],
  );
  assert.deepEqual(
    grouped[0].items.map((item) => item.id),
    ["apr", "apr-later"],
  );
  assert.deepEqual(
    grouped[1].items.map((item) => item.id),
    ["mar", "mar-earlier"],
  );
  assert.equal(grouped[0].year, 2026);
  assert.equal(grouped[0].month, 4);
  assert.equal(grouped[2].year, null);
  assert.deepEqual(
    grouped[2].items.map((item) => item.id),
    ["blank"],
  );
});

test("monthly report bars compare the four counts and do not invent a score", () => {
  assert.equal(reportBarWidth(0, 4), 0);
  assert.equal(reportBarWidth(-3, 4), 0);
  assert.equal(reportBarWidth(1, 0), 0);
  assert.equal(reportBarWidth(4, 4), 100);
  assert.equal(reportBarWidth(1, 4), 25);
  assert.equal(reportBarWidth(1, 9999), 4);

  const bars = monthlyReportBars({
    thanksGiven: 2,
    echoes: 0,
    gratitudesDrawn: 1.8,
    pauseWeeks: Number.NaN,
  });
  assert.deepEqual(
    bars.map((bar) => [bar.key, bar.count, bar.width]),
    [
      ["thanksGiven", 2, 100],
      ["echoes", 0, 0],
      ["gratitudesDrawn", 1, 50],
      ["pauseWeeks", 0, 0],
    ],
  );

  const quiet = monthlyReportBars({
    thanksGiven: 0,
    echoes: 0,
    gratitudesDrawn: 0,
    pauseWeeks: 0,
  });
  assert.ok(quiet.every((bar) => bar.width === 0 && bar.count === 0));
});

test("desk edges point at pause and leave, and guests cannot leave", () => {
  assert.equal(WEEK_PAUSE_ANCHOR, "week-pause");
  assert.equal(LEAVE_DESK_ANCHOR, "leave-desk");
  assert.equal(weekPausePath(), "/review#week-pause");
  assert.equal(leaveDeskPath(), "/account#leave-desk");
  assert.deepEqual(deskEdgeLinks(false), ["pause"]);
  assert.deepEqual(deskEdgeLinks(true), ["pause", "leave"]);
});

test("history, the soft report, and desk edges are wired without mail or payments", () => {
  const history = read("src/components/history-list.tsx");
  const historyPage = read("src/app/[locale]/history/page.tsx");
  const report = read("src/components/soft-report-section.tsx");
  const pause = read("src/components/soft-pause-card.tsx");
  const leave = read("src/components/soft-leave-card.tsx");
  const account = read("src/components/account-panel.tsx");
  const footer = read("src/components/site-footer.tsx");
  const edges = read("src/components/desk-edges.tsx");

  assert.match(history, /groupHistoryByMonth/);
  assert.match(history, /data-history-months="open"/);
  assert.match(history, /data-history-month=\{group\.key\}/);
  assert.match(history, /monthLead/);
  assert.match(historyPage, /timeZone=\{settings\?\.timezone/);

  assert.match(report, /monthlyReportBars/);
  assert.match(report, /data-soft-report-chart="open"/);
  assert.match(report, /data-soft-report-chart="tease"/);
  assert.match(report, /data-soft-report-width=\{bar\.width\}/);
  assert.match(report, /chartLead/);
  assert.match(report, /chartTeaseLead/);
  assert.doesNotMatch(report, /animation/);

  assert.match(pause, /WEEK_PAUSE_ANCHOR/);
  assert.match(pause, /beside-pause/);
  assert.match(leave, /LEAVE_DESK_ANCHOR/);
  assert.match(account, /variant="account"/);
  assert.match(footer, /getCurrentUser/);
  assert.match(footer, /variant="footer"/);
  assert.match(edges, /weekPausePath/);
  assert.match(edges, /leaveDeskPath/);
  assert.match(edges, /deskEdgeLinks/);

  const fresh = [history, report, pause, leave, edges].join("\n");
  assert.doesNotMatch(fresh, /sendMail|resend|stripe|nodemailer|SMTP/i);
});

test("month, chart, and desk-edge copy exists in en / zh-tw / ja", () => {
  const keys = {
    History: ["monthLead", "monthCount", "undatedTitle", "undatedHint"],
    Digest: ["chartLead", "chartEmpty", "chartTeaseLead"],
    DeskEdges: ["title", "lead", "pause", "leave", "leaveBeside", "navLabel"],
  };
  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));

  for (const messages of locales) {
    for (const [namespace, names] of Object.entries(keys)) {
      for (const name of names) {
        assert.equal(typeof messages[namespace][name], "string");
        assert.ok(messages[namespace][name].length > 0);
      }
    }
    assert.match(messages.DeskEdges.lead, /mail|信|メール/i);
    assert.match(messages.Digest.chartLead, /better|比較好|良い月/);
    assert.doesNotMatch(messages.Digest.chartTeaseLead, /zh-TW/);
  }

  const [en, zh, ja] = locales;
  assert.equal(en.History.undatedTitle, "Without a date");
  assert.equal(zh.DeskEdges.pause, "讓這一週休息");
  assert.equal(ja.DeskEdges.leave, "机を離れる");
  assert.notEqual(en.History.monthLead, zh.History.monthLead);
  assert.notEqual(en.History.monthLead, ja.History.monthLead);
  assert.notEqual(en.Digest.chartEmpty, zh.Digest.chartEmpty);
  assert.notEqual(en.Digest.chartEmpty, ja.Digest.chartEmpty);
});
