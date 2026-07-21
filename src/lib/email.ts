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

export class BrevoEmailProvider implements TransactionalEmailProvider {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: TransactionalEmail) {
    const sender = parseSender(this.from);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": this.apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        sender,
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    });
    if (!response.ok) throw new Error(`Transactional email provider returned ${response.status}.`);
  }
}

export function parseSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  if (match) return { name: match[1] || "WorkAtlas", email: match[2] };
  if (/^[^<>\s]+@[^<>\s]+$/.test(value.trim())) return { name: "WorkAtlas", email: value.trim() };
  throw new Error("EMAIL_FROM must be an email address or use Name <email@example.com> format.");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export function getEmailProvider(): TransactionalEmailProvider | null {
  const environment = getEmailEnvironment();
  if (!environment.EMAIL_FROM) return null;
  if (environment.EMAIL_PROVIDER === "brevo") {
    return environment.BREVO_API_KEY ? new BrevoEmailProvider(environment.BREVO_API_KEY, environment.EMAIL_FROM) : null;
  }
  return environment.RESEND_API_KEY ? new ResendEmailProvider(environment.RESEND_API_KEY, environment.EMAIL_FROM) : null;
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

export async function sendTaskReminderEmail(input: {
  email: string;
  name: string;
  taskTitle: string;
  projectTitle: string;
  deadlineAt: Date;
}) {
  const environment = getEmailEnvironment();
  const provider = getEmailProvider();
  if (!provider) return false;
  const taskUrl = new URL("/dashboard/tasks", environment.NEXT_PUBLIC_APP_URL).toString();
  const deadline = input.deadlineAt.toISOString();
  await provider.send({
    to: input.email,
    subject: `Task reminder: ${input.taskTitle}`,
    text: `Hello ${input.name},\n\nYour task "${input.taskTitle}" in "${input.projectTitle}" is due at ${deadline}.\n\nOpen WorkAtlas: ${taskUrl}`,
    html: `<p>Hello ${escapeHtml(input.name)},</p><p>Your task <strong>${escapeHtml(input.taskTitle)}</strong> in <strong>${escapeHtml(input.projectTitle)}</strong> is due at ${escapeHtml(deadline)}.</p><p><a href="${escapeHtml(taskUrl)}">Open WorkAtlas</a></p>`,
  });
  return true;
}
