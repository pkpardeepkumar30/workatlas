"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, inputClass } from "@/components/ui";

export function AuthForm({ mode, registrationEnabled = true }: { mode: "sign-in" | "sign-up"; registrationEnabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "Authentication failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isSignUp && (
        <label className="block text-sm font-medium text-slate-700">Name
          <input name="name" required minLength={2} className={`${inputClass} mt-1.5`} autoComplete="name" />
        </label>
      )}
      <label className="block text-sm font-medium text-slate-700">Email
        <input name="email" type="email" required className={`${inputClass} mt-1.5`} autoComplete="email" />
      </label>
      <label className="block text-sm font-medium text-slate-700">Password
        <input name="password" type="password" required minLength={8} className={`${inputClass} mt-1.5`} autoComplete={isSignUp ? "new-password" : "current-password"} />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button disabled={pending} className="w-full">{pending ? "Working…" : isSignUp ? "Create account" : "Sign in"}</Button>
      {(isSignUp || registrationEnabled) ? (
        <p className="text-center text-sm text-slate-500">
          {isSignUp ? "Already registered?" : "Need an account?"}{" "}
          <Link className="font-semibold text-indigo-600" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create one"}</Link>
        </p>
      ) : (
        <p className="text-center text-sm text-slate-500">Registration is currently invite-only.</p>
      )}
    </form>
  );
}
