import { describe, expect, it, vi } from "vitest";
import { rateLimitResult } from "@/lib/rate-limit-rules";
import { applyPasswordResetEffects, tokenRecordStatus } from "@/lib/security-token-rules";
import { verifyTurnstileResponse } from "@/lib/turnstile";

describe("single-use token rules", () => {
  const now = new Date("2026-07-17T12:00:00Z");
  it("rejects expired and consumed tokens", () => {
    expect(tokenRecordStatus({ expiresAt: new Date("2026-07-17T11:00:00Z"), consumedAt: null }, now)).toBe("expired");
    expect(tokenRecordStatus({ expiresAt: new Date("2026-07-18T12:00:00Z"), consumedAt: now }, now)).toBe("consumed");
  });
  it("accepts only a live unused token", () => {
    expect(tokenRecordStatus({ expiresAt: new Date("2026-07-18T12:00:00Z"), consumedAt: null }, now)).toBe("valid");
  });
  it("invalidates every existing session after changing the password", async () => {
    const effects = { updatePassword: vi.fn(async () => undefined), invalidateSessions: vi.fn(async () => undefined) };
    const now = new Date("2026-07-17T12:00:00Z");
    await applyPasswordResetEffects(effects, "user-1", "new-hash", now);
    expect(effects.updatePassword).toHaveBeenCalledWith("user-1", "new-hash", now);
    expect(effects.invalidateSessions).toHaveBeenCalledWith("user-1");
  });
});

describe("fixed-window rate limits", () => {
  const policy = { limit: 2, windowMs: 60_000 };
  const now = new Date("2026-07-17T12:00:00Z");
  const expires = new Date("2026-07-17T12:01:00Z");
  it("allows attempts up to the limit and blocks the next one", () => {
    expect(rateLimitResult(2, policy, expires, now)).toMatchObject({ allowed: true, remaining: 0 });
    expect(rateLimitResult(3, policy, expires, now)).toMatchObject({ allowed: false, remaining: 0 });
  });
  it("reports a fresh window independently", () => {
    expect(rateLimitResult(1, policy, new Date("2026-07-17T12:02:00Z"), new Date("2026-07-17T12:01:00Z"))).toMatchObject({ allowed: true, remaining: 1 });
  });
});

describe("Turnstile verification", () => {
  it("accepts a successful server verification and rejects missing tokens", async () => {
    const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as unknown as typeof fetch;
    await expect(verifyTurnstileResponse({ token: "test-token", secretKey: "test-secret", fetchImplementation })).resolves.toBe(true);
    await expect(verifyTurnstileResponse({ token: undefined, secretKey: "test-secret", fetchImplementation })).resolves.toBe(false);
  });
  it("rejects provider failures", async () => {
    const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as unknown as typeof fetch;
    await expect(verifyTurnstileResponse({ token: "duplicate", secretKey: "test-secret", fetchImplementation })).resolves.toBe(false);
  });
});
