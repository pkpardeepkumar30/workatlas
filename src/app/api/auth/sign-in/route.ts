import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTurnstileEnvironment } from "@/lib/env";
import {
  clearRateLimit,
  consumeRateLimit,
  enforceRateLimit,
  getClientIp,
  getRateLimitCount,
  RateLimitError,
  rateLimitPolicies,
} from "@/lib/rate-limit";
import { verifyTurnstileResponse } from "@/lib/turnstile";
import { requiresEmailVerification } from "@/lib/verification-policy";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  "cf-turnstile-response": z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  const clientIp = getClientIp(request);
  const loginIdentifier = `${clientIp}:${parsed.data.email}`;
  try {
    await enforceRateLimit("login", loginIdentifier, rateLimitPolicies.login);
    const failures = await getRateLimitCount("login-failure", loginIdentifier, rateLimitPolicies.loginFailure);
    const turnstile = getTurnstileEnvironment();
    const turnstileRequired = turnstile.enabled && failures >= 3;
    if (turnstileRequired && !(await verifyTurnstileResponse({
      token: parsed.data["cf-turnstile-response"],
      remoteIp: clientIp,
      secretKey: turnstile.secretKey!,
    }))) {
      return NextResponse.json({ error: "Complete the security check before trying again.", turnstileRequired: true }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      const failure = await consumeRateLimit("login-failure", loginIdentifier, rateLimitPolicies.loginFailure);
      return NextResponse.json(
        { error: "Invalid email or password.", turnstileRequired: turnstile.enabled && failure.count >= 3 },
        { status: 401 },
      );
    }
    await clearRateLimit("login-failure", loginIdentifier);
    await setSessionCookie(user);
    const verificationRequired = requiresEmailVerification(user);
    return NextResponse.json({ ok: true, redirectTo: verificationRequired ? "/verify-email/pending" : "/dashboard" });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } });
    }
    console.error("Sign-in service failed");
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
