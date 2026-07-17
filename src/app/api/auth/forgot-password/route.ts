import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { enforceRateLimit, getClientIp, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/security-tokens";
import { validateTurnstileIfEnabled } from "@/lib/turnstile";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), "cf-turnstile-response": z.string().optional() });
const genericMessage = "If an account can receive email at that address, reset instructions will be sent shortly.";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const clientIp = getClientIp(request);
  try {
    await enforceRateLimit("forgot-password-ip", clientIp, rateLimitPolicies.forgotPasswordIp);
    await enforceRateLimit("forgot-password-email", parsed.data.email, rateLimitPolicies.forgotPasswordEmail);
    if (!(await validateTurnstileIfEnabled(parsed.data["cf-turnstile-response"], clientIp))) {
      return NextResponse.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (user) {
      const token = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user, token);
    }
    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error("Password reset request failed");
    return NextResponse.json({ message: genericMessage });
  }
}

export const runtime = "nodejs";
