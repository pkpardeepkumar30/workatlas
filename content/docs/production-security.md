---
title: Production security
description: Configure email verification, password reset, Turnstile, health monitoring, and a future custom domain.
order: 5
published: true
---

## Email delivery

WorkAtlas supports a pluggable transactional-email boundary with a Resend provider. Add and verify a domain in Resend, configure the exact DNS records it supplies, and create a restricted sending API key. Set `RESEND_API_KEY` and an `EMAIL_FROM` address on that verified domain.

Keep `EMAIL_VERIFICATION_REQUIRED=false` until test registration, verification, resend, and password reset emails arrive successfully. Enabling verification without delivery would prevent new users from reaching authenticated pages.

WorkAtlas does not currently expose an email-change operation. Any future implementation must require current-account proof and verify the replacement address before changing the stored email.

## Turnstile

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ENABLED=true`. Browser completion is never sufficient: the server calls Cloudflare Siteverify for every protected submission.

For local testing only, Cloudflare documents these always-pass credentials:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
TURNSTILE_ENABLED=true
```

Never use test keys in production. Create a production widget with only the intended production hostnames.

## Health monitoring

Monitor `/api/health` over HTTPS. A healthy response is:

```json
{"status":"ok","database":"connected"}
```

UptimeRobot can monitor this URL every five minutes and alert when it receives a non-200 response. The endpoint intentionally exposes no diagnostic internals.

## Adding a custom domain later

Add the domain in Vercel Project Settings, configure the DNS records Vercel displays, and wait for HTTPS to become active. Then update `NEXT_PUBLIC_APP_URL` and redeploy. Also update Turnstile hostname restrictions and verification/reset callback expectations.

Email DNS verification is separate. A custom domain must still be added and verified in Resend before it can appear in `EMAIL_FROM`.
