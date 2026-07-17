import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailVerificationToken } from "@/lib/security-tokens";
import { enforceRateLimit, getClientIp, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
  try {
    await enforceRateLimit("verify-email", `${getClientIp(request)}:${parsed.data.token}`, rateLimitPolicies.resetPassword);
    const verified = await consumeEmailVerificationToken(parsed.data.token);
    if (!verified) return NextResponse.json({ error: "This verification link is invalid, expired, or has already been used." }, { status: 400 });
    return NextResponse.json({ message: "Your email address is verified." });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return NextResponse.json({ error: "Email verification is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
