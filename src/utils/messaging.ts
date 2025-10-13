// utils/messaging.ts
import { mailer } from "./mailer";
// If you add SMS, integrate Twilio/Nexmo and wrap here.

export async function renderTemplateAndSend({ case: c, template, channel }: any) {
  const ctx = {
    firstName: (c as any)?.memberId?.firstName || c?.prospect?.firstName || "Friend",
    churchName: "Dominion Connect",
  };
  const body = template.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => (ctx as any)[key] ?? "");

  if (channel === "email") {
    const to = (c as any)?.memberId?.email || c?.prospect?.email;
    if (!to) return;
    await mailer(to, template.subject || "Hello from Dominion Connect", body, `<div>${body}</div>`);
  }
  // if (channel === "sms") send via SMS provider
}
