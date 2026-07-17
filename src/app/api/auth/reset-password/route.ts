import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie } from "@/lib/auth";
import { enforceRateLimit, getClientIp, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/security-token-rules";
import { resetPasswordWithToken } from "@/lib/security-tokens";

const schema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
  passwordConfirmation: z.string(),
}).refine((input) => input.password === input.passwordConfirmation, { path: ["passwordConfirmation"], message: "Passwords do not match." });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reset request." }, { status: 400 });
  try {
    await enforceRateLimit("reset-password", `${getClientIp(request)}:${parsed.data.token}`, rateLimitPolicies.resetPassword);
    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
