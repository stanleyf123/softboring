function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getEmailFromAddress() {
  return readEnv("EMAIL_FROM") || "Soft Boring Weekly <noreply@softboring.com>";
}

export function isEmailConfigured() {
  return Boolean(readEnv("RESEND_API_KEY") || readEnv("SMTP_HOST"));
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  const from = getEmailFromAddress();
  const resendKey = readEnv("RESEND_API_KEY");
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${escapeHtml(input.text)}</pre>`,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Resend email failed", response.status, detail);
      throw new Error("email_send_failed");
    }
    return { sent: true };
  }

  await sendSmtpEmail({ ...input, from });
  return { sent: true };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendSmtpEmail(input: SendEmailInput & { from: string }) {
  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT") || "587");
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const secure =
    readEnv("SMTP_SECURE") === "true" || port === 465;

  const nodemailer = (await import("nodemailer")) as unknown as {
    createTransport?: (options: {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
    }) => { sendMail: (options: Record<string, unknown>) => Promise<unknown> };
    default?: {
      createTransport: (options: {
        host: string;
        port: number;
        secure: boolean;
        auth?: { user: string; pass: string };
      }) => { sendMail: (options: Record<string, unknown>) => Promise<unknown> };
    };
  };
  const createTransport = nodemailer.createTransport ?? nodemailer.default?.createTransport;
  if (!createTransport) {
    throw new Error("smtp_unavailable");
  }
  const transporter = createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
