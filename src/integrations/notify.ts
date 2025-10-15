import { mailer } from "../utils/mailer";
import type { IDemoRequest } from "../models/DemoRequest";

// Who receives internal notifications
const DEMO_TO = process.env.DEMO_NOTIF_TO || process.env.SALES_EMAIL || process.env.ADMIN_EMAIL;
// Optional BCC (eg your CRM dropbox)
const DEMO_BCC = process.env.DEMO_NOTIF_BCC || "";

export async function sendDemoNotification(doc: IDemoRequest) {
  if (!DEMO_TO) {
    console.warn("⚠️ DEMO_NOTIF_TO (or SALES_EMAIL/ADMIN_EMAIL) not set; skipping internal email.");
    return;
  }

  const subject = `New Demo Request: ${doc.fullName} (${doc.email})`;
  const text = [
    `New demo request`,
    `Name: ${doc.fullName}`,
    `Email: ${doc.email}`,
    `Phone: ${doc.phone || "—"}`,
    `Church: ${doc.church || "—"}`,
    `Role: ${doc.role || "—"}`,
    `Size: ${doc.size || "—"}`,
    `Interests: ${doc.interests?.join(", ") || "—"}`,
    `Goals: ${doc.goals || "—"}`,
    `Timeframe: ${doc.timeframe || "—"}`,
    `Budget: ${doc.budget || "—"}`,
    `Pref: ${doc.demoPref || "—"}`,
    `Notes: ${doc.notes || "—"}`,
    `Source: ${doc.source || "public_web"}`,
    `When: ${new Date(doc.createdAt).toLocaleString()}`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45">
      <h2 style="margin:0 0 12px">New demo request</h2>
      <table style="border-collapse:collapse">
        ${row("Name", doc.fullName)}
        ${row("Email", doc.email)}
        ${row("Phone", doc.phone)}
        ${row("Church", doc.church)}
        ${row("Role", doc.role)}
        ${row("Size", doc.size)}
        ${row("Interests", doc.interests?.join(", "))}
        ${row("Goals", doc.goals)}
        ${row("Timeframe", doc.timeframe)}
        ${row("Budget", doc.budget)}
        ${row("Preferred Demo", doc.demoPref)}
        ${row("Notes", doc.notes)}
        ${row("Source", doc.source || "public_web")}
        ${row("Submitted", new Date(doc.createdAt).toLocaleString())}
      </table>
    </div>
  `;

  await mailer(
    DEMO_TO,
    subject,
    text,
    html
  );

  // Optional: also send to BCC (CRM inbox, etc.)
  if (DEMO_BCC) {
    await mailer(DEMO_BCC, subject, text, html);
  }

  // Optional autoresponder to requester
  if (process.env.DEMO_AUTOREPLY !== "false" && doc.email) {
    const fromName = process.env.DEMO_AUTOREPLY_FROM_NAME || "Dominion Connect";
    const replySubject = "Thanks—We received your demo request";
    const replyText = `Hi ${doc.fullName},

Thanks for your interest in Dominion Connect! Our team will reach out shortly to coordinate a personalized walkthrough.

If you have any urgent questions, just reply to this email.

— ${fromName}
`;
    const replyHtml = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45">
        <p>Hi ${escapeHtml(doc.fullName)},</p>
        <p>Thanks for your interest in <strong>Dominion Connect</strong>! Our team will reach out shortly to coordinate a personalized walkthrough.</p>
        <p>If you have any urgent questions, just reply to this email.</p>
        <p>— ${escapeHtml(fromName)}</p>
      </div>
    `;
    await mailer(doc.email, replySubject, replyText, replyHtml);
  }
}

function row(label?: string, value?: string) {
  const v = value ? escapeHtml(String(value)) : "—";
  return `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(label || "")}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
