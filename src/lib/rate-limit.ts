import { createHmac } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { authRateLimits } from "@/db/schema";
import { db } from "@/lib/db";
import { getAuthEnvironment } from "@/lib/env";
import { rateLimitPolicies, rateLimitResult, type RateLimitPolicy } from "@/lib/rate-limit-rules";

export { rateLimitPolicies };

function identifierHash(identifier: string) {
  return createHmac("sha256", getAuthEnvironment().sessionSecret).update(`rate-limit:${identifier}`).digest("hex");
}

export async function consumeRateLimit(action: string, identifier: string, policy: RateLimitPolicy, now = new Date()) {
  const windowStart = new Date(Math.floor(now.getTime() / policy.windowMs) * policy.windowMs);
  const expiresAt = new Date(windowStart.getTime() + policy.windowMs);
  const hash = identifierHash(identifier);
  const [record] = await db.insert(authRateLimits).values({ action, identifierHash: hash, windowStart, expiresAt })
    .onConflictDoUpdate({
      target: [authRateLimits.action, authRateLimits.identifierHash, authRateLimits.windowStart],
      set: { count: sql`${authRateLimits.count} + 1`, expiresAt, updatedAt: now },
    })
    .returning({ count: authRateLimits.count, expiresAt: authRateLimits.expiresAt });
  if (Math.random() < 0.02) await db.delete(authRateLimits).where(lt(authRateLimits.expiresAt, now));
  return rateLimitResult(record.count, policy, record.expiresAt, now);
}

export async function getRateLimitCount(action: string, identifier: string, policy: RateLimitPolicy, now = new Date()) {
  const windowStart = new Date(Math.floor(now.getTime() / policy.windowMs) * policy.windowMs);
  const [record] = await db.select({ count: authRateLimits.count }).from(authRateLimits)
    .where(and(eq(authRateLimits.action, action), eq(authRateLimits.identifierHash, identifierHash(identifier)), eq(authRateLimits.windowStart, windowStart)))
    .limit(1);
  return record?.count ?? 0;
}

export async function clearRateLimit(action: string, identifier: string) {
  await db.delete(authRateLimits).where(and(eq(authRateLimits.action, action), eq(authRateLimits.identifierHash, identifierHash(identifier))));
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute${retryAfterSeconds > 60 ? "s" : ""}.`);
  }
}

export async function enforceRateLimit(action: string, identifier: string, policy: RateLimitPolicy) {
  const result = await consumeRateLimit(action, identifier, policy);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
  return result;
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}
