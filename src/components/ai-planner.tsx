"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui";

export function AiPlanner() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request: form.get("request") }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "The planner could not complete the request.");
      return;
    }
    setResult(payload.result ?? "");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Planning request
          <textarea
            name="request"
            required
            rows={10}
            className={`${inputClass} mt-1.5`}
            placeholder="Review my current portfolio and recommend the three projects I should prioritize this month. Explain which projects should be deferred."
          />
        </label>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The server sends your request and a concise summary of your own projects to the configured OpenAI model. It does not modify tasks automatically.
        </p>
        <Button className="mt-4 w-full" disabled={pending}>
          {pending ? "Analysing…" : "Generate plan"}
        </Button>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>
      <section className="min-h-96 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-950">Recommendation</h2>
        {result ? (
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result}</div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-slate-500">
            Configure <code className="rounded bg-slate-100 px-1.5 py-0.5">OPENAI_API_KEY</code> and submit a planning request. The application uses the Responses API from the server, so the key is never sent to the browser.
          </p>
        )}
      </section>
    </div>
  );
}
