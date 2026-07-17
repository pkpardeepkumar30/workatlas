"use client";

import Script from "next/script";

export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  return (
    <div className="space-y-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
      <p className="text-xs text-slate-500">This security check expires automatically; complete it again if the form is rejected.</p>
    </div>
  );
}
