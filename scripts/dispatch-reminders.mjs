import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const fromEnv = process.env.SQLITE_PATH?.trim();
const configured =
  fromEnv && fromEnv.length > 0 ? fromEnv : "./data/softboring.sqlite";
const sqlitePath = isAbsolute(configured)
  ? configured
  : resolve(process.cwd(), configured);

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function isEmailConfigured() {
  return Boolean(readEnv("RESEND_API_KEY") || readEnv("SMTP_HOST"));
}

function getEmailFromAddress() {
  return readEnv("EMAIL_FROM") || "Soft Boring Weekly <noreply@softboring.com>";
}

function siteUrl() {
  return (readEnv("SITE_URL") || "https://softboring.com").replace(/\/+$/, "");
}

async function sendResend({ to, subject, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [to],
      subject,
      text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend failed ${response.status}: ${detail}`);
  }
}

async function sendSmtp({ to, subject, text }) {
  const nodemailer = await import("nodemailer");
  const port = Number(readEnv("SMTP_PORT") || "587");
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const transporter = nodemailer.createTransport({
    host: readEnv("SMTP_HOST"),
    port: Number.isFinite(port) ? port : 587,
    secure: readEnv("SMTP_SECURE") === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from: getEmailFromAddress(),
    to,
    subject,
    text,
  });
}

async function sendEmail(input) {
  if (readEnv("RESEND_API_KEY")) {
    await sendResend(input);
    return;
  }
  await sendSmtp(input);
}

function reminderBody(email) {
  const origin = siteUrl();
  return `Hi ${email},

A quiet nudge from Soft Boring Weekly — if this is a good day, sit down for six small questions.

${origin}/en/review
${origin}/zh-tw/review
${origin}/ja/review

You can change the weekday or turn this off on your account page.

— Soft Boring`;
}

export function listDueReminderUsers(db, now = new Date()) {
  const weekday = now.getDay();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return db
    .prepare(
      `SELECT u.id AS user_id, u.email
       FROM user_settings s
       JOIN users u ON u.id = s.user_id
       WHERE s.reminder_enabled = 1
         AND s.reminder_weekday = ?
         AND (s.reminder_last_sent_at IS NULL OR datetime(s.reminder_last_sent_at) < datetime(?))`,
    )
    .all(weekday, startOfToday.toISOString());
}

async function main() {
  if (!isEmailConfigured()) {
    console.log("reminders:dispatch: email not configured; no-op.");
    return;
  }

  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");

  const due = listDueReminderUsers(db);
  if (due.length === 0) {
    console.log("reminders:dispatch: no users due today.");
    db.close();
    return;
  }

  const sentAt = new Date().toISOString();
  const mark = db.prepare(
    `UPDATE user_settings SET reminder_last_sent_at = ? WHERE user_id = ?`,
  );

  let sent = 0;
  for (const user of due) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Soft Boring Weekly — a quiet reminder",
        text: reminderBody(user.email),
      });
      mark.run(sentAt, user.user_id);
      sent += 1;
    } catch (error) {
      console.error(`reminders:dispatch: failed for ${user.email}`, error);
    }
  }

  db.close();
  console.log(`reminders:dispatch: sent ${sent} of ${due.length}.`);
}

const isMain =
  typeof process.argv[1] === "string" &&
  process.argv[1].includes("dispatch-reminders");
if (isMain) {
  main().catch((error) => {
    console.error("reminders:dispatch failed", error);
    process.exit(1);
  });
}
