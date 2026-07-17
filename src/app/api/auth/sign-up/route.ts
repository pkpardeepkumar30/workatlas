import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { isRegistrationEnabled, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { getEmailEnvironment } from "@/lib/env";
import { enforceRateLimit, getClientIp, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/security-token-rules";
import { createEmailVerificationToken } from "@/lib/security-tokens";
import { validateTurnstileIfEnabled } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  "cf-turnstile-response": z.string().optional(),
});

export async function POST(request: Request) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const clientIp = getClientIp(request);
  try {
    await enforceRateLimit("registration", clientIp, rateLimitPolicies.registration);
    if (!(await validateTurnstileIfEnabled(parsed.data["cf-turnstile-response"], clientIp))) {
      return NextResponse.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (existing[0]) {
      return NextResponse.json({ ok: true, redirectTo: "/sign-in?registration=received" });
    }
    const environment = getEmailEnvironment();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const verifiedAt = environment.verificationRequired ? null : new Date();
    const [user] = await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      emailVerifiedAt: verifiedAt,
    }).returning();
    await setSessionCookie(user);
    if (environment.verificationRequired) {
      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user, token);
      return NextResponse.json({ ok: true, redirectTo: "/verify-email/pending" });
    }
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } });
    }
    console.error("Registration service failed");
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
