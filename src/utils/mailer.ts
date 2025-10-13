// src/utils/mailer.ts
import nodemailer from "nodemailer";

export const mailer = async (to: string, subject: string, text: string, html?: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Dominion Connect <no-reply@dominionconnect.com>",
    to,
    subject,
    text,
    html,
  });

  console.log(`📧 Email sent: ${info.messageId}`);
};
