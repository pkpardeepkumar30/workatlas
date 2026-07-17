"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button, inputClass } from "@/components/ui";

function Message({ kind, children }: { kind: "error" | "success"; children: string }) {
  return <p role={kind === "error" ? "alert" : "status"} className={kind === "error" ? "rounded-xl bg-red-50 p-3 text-sm text-red-700" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{children}</p>;
}

export function ForgotPasswordForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) return setError(payload.error ?? "The request could not be completed.");
    router.push("/forgot-password/check-email");
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">Email<input name="email" type="email" required autoComplete="email" className={`${inputClass} mt-1.5`} /></label>
    {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} />}
    {error && <Message kind="error">{error}</Message>}
    <Button disabled={pending} className="w-full">{pending ? "Sending…" : "Send reset instructions"}</Button>
    <p className="text-center text-sm"><Link href="/sign-in" className="font-semibold text-indigo-600">Back to sign in</Link></p>
  </form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, ...Object.fromEntries(form.entries()) }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) return setMessage({ kind: "error", text: payload.error ?? "The password could not be reset." });
    setMessage({ kind: "success", text: "Your password has been reset and all previous sessions were signed out." });
    event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">New password<input name="password" type="password" required minLength={12} autoComplete="new-password" className={`${inputClass} mt-1.5`} /></label>
    <p className="text-xs text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
    <label className="block text-sm font-medium text-slate-700">Confirm password<input name="passwordConfirmation" type="password" required minLength={12} autoComplete="new-password" className={`${inputClass} mt-1.5`} /></label>
    {message && <Message kind={message.kind}>{message.text}</Message>}
    <Button disabled={pending} className="w-full">{pending ? "Resetting…" : "Reset password"}</Button>
    {message?.kind === "success" && <p className="text-center text-sm"><Link href="/sign-in" className="font-semibold text-indigo-600">Sign in with the new password</Link></p>}
  </form>;
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function verify() {
    setPending(true);
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    setMessage({ kind: response.ok ? "success" : "error", text: payload.message ?? payload.error ?? "Verification failed." });
  }
  return <div className="space-y-4">
    {message && <Message kind={message.kind}>{message.text}</Message>}
    {message?.kind !== "success" && <Button type="button" disabled={pending || !token} onClick={verify} className="w-full">{pending ? "Verifying…" : "Verify email"}</Button>}
    {message?.kind === "success" && <Link href="/dashboard" className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Continue to WorkAtlas</Link>}
  </div>;
}

export function ResendVerificationButton() {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function resend() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    setMessage({ kind: response.ok ? "success" : "error", text: payload.message ?? payload.error ?? "The request could not be completed." });
  }
  return <div className="space-y-3">
    <Button type="button" disabled={pending} onClick={resend} className="w-full">{pending ? "Sending…" : "Resend verification email"}</Button>
    {message && <Message kind={message.kind}>{message.text}</Message>}
  </div>;
}
