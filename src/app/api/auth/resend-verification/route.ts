import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { createEmailVerificationToken } from "@/lib/security-tokens";
import { enforceRateLimit, getClientIp, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to request another verification email." }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ message: "Your email address is already verified." });
  try {
    await enforceRateLimit("resend-verification-user", user.id, rateLimitPolicies.resendVerification);
    await enforceRateLimit("resend-verification-ip", getClientIp(request), rateLimitPolicies.resendVerification);
    const token = await createEmailVerificationToken(user.id);
    const sent = await sendVerificationEmail(user, token);
    if (!sent) return NextResponse.json({ error: "Email delivery is not configured yet." }, { status: 503 });
    return NextResponse.json({ message: "If delivery is available, a fresh verification email is on its way." });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error("Verification email request failed");
    return NextResponse.json({ error: "The verification email could not be sent." }, { status: 503 });
  }
}

export const runtime = "nodejs";
