import nodemailer from "nodemailer";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function makeTransporter() {
  const host = must("EMAIL_HOST");      // e.g. smtp.gmail.com
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = must("EMAIL_USER");      // Gmail address
  const pass = must("EMAIL_PASS");      // 16-char Gmail App Password
  const secure = port === 465;          // 465=true, 587=false

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // make hangs obvious instead of “forever”
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    requireTLS: !secure, // STARTTLS on 587
  });
}

export async function mailer(
  to: string,
  subject: string,
  text: string,
  html?: string
) {
  const from =
    process.env.EMAIL_FROM || must("EMAIL_USER"); // From should match Gmail account

  const tx = makeTransporter();

  // helpful diagnostics (runs once at start of request)
  try {
    await tx.verify();
  } catch (e: any) {
    console.error("SMTP verify failed:", e?.message || e);
    throw new Error("Email service is not reachable/configured");
  }

  const info = await tx.sendMail({ from, to, subject, text, html });
  console.log(`📧 Email sent: ${info.messageId}`);
}
