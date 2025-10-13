// src/utils/mailer.ts
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getEnv(key: string) {
  return process.env[key];
}

function resolveSmtpConfig() {
  const host = getEnv("SMTP_HOST") ?? getEnv("EMAIL_HOST");
  const port = Number(getEnv("SMTP_PORT") ?? getEnv("EMAIL_PORT") ?? 587);
  const user = getEnv("SMTP_USER") ?? getEnv("EMAIL_USER");
  const pass = getEnv("SMTP_PASS") ?? getEnv("EMAIL_PASS");
  const from =
    getEnv("SMTP_FROM") ??
    getEnv("EMAIL_FROM") ??
    '"Dominion Connect" <no-reply@dominionconnect.com>';
  const secure =
    (getEnv("SMTP_SECURE") ?? "").toLowerCase() === "true" || port === 465;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured: set SMTP_* or EMAIL_* envs (HOST, PORT, USER, PASS, FROM)"
    );
  }

  return { host, port, user, pass, from, secure };
}

function getTransporter() {
  if (!transporter) {
    const cfg = resolveSmtpConfig();
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure, // 465=true, 587=false (STARTTLS)
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return transporter;
}

export async function mailer(
  to: string,
  subject: string,
  text: string,
  html?: string
) {
  const { from } = resolveSmtpConfig(); // will throw if misconfigured
  const tx = getTransporter();

  // Optional: verify once in dev
  if (process.env.NODE_ENV !== "production") {
    try {
      await tx.verify();
      // console.log("SMTP verified");
    } catch (e) {
      console.error("SMTP verify failed:", e);
    }
  }

  const info = await tx.sendMail({ from, to, subject, text, html });
  console.log(`📧 Email sent: ${info.messageId}`);
}
