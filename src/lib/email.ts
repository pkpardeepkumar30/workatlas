import { getEmailEnvironment } from "@/lib/env";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface TransactionalEmailProvider {
  send(message: TransactionalEmail): Promise<void>;
}

export class ResendEmailProvider implements TransactionalEmailProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: TransactionalEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.from, ...message }),
    });
    if (!response.ok) throw new Error(`Transactional email provider returned ${response.status}.`);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export function getEmailProvider(): TransactionalEmailProvider | null {
  const environment = getEmailEnvironment();
  if (!environment.RESEND_API_KEY || !environment.EMAIL_FROM) return null;
  return new ResendEmailProvider(environment.RESEND_API_KEY, environment.EMAIL_FROM);
}

async function sendLinkEmail({ to, name, path, subject, purpose }: { to: string; name: string; path: string; subject: string; purpose: string }) {
  const environment = getEmailEnvironment();
  const provider = getEmailProvider();
  if (!provider) return false;
  const url = new URL(path, environment.NEXT_PUBLIC_APP_URL).toString();
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  await provider.send({
    to,
    subject,
    text: `Hello ${name},\n\n${purpose}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>${escapeHtml(purpose)}:</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  return true;
}

export function sendVerificationEmail(user: { email: string; name: string }, token: string) {
  return sendLinkEmail({
    to: user.email,
    name: user.name,
    path: `/verify-email?token=${encodeURIComponent(token)}`,
    subject: "Verify your WorkAtlas email",
    purpose: "Verify your email address by opening this secure, single-use link",
  });
}

export function sendPasswordResetEmail(user: { email: string; name: string }, token: string) {
  return sendLinkEmail({
    to: user.email,
    name: user.name,
    path: `/reset-password?token=${encodeURIComponent(token)}`,
    subject: "Reset your WorkAtlas password",
    purpose: "Reset your password by opening this secure, single-use link within one hour",
  });
}
