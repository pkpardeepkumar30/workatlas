export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number; count: number };

export const rateLimitPolicies = {
  registration: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 20, windowMs: 15 * 60 * 1000 },
  loginFailure: { limit: 10, windowMs: 15 * 60 * 1000 },
  resendVerification: { limit: 3, windowMs: 60 * 60 * 1000 },
  forgotPasswordEmail: { limit: 3, windowMs: 60 * 60 * 1000 },
  forgotPasswordIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  resetPassword: { limit: 8, windowMs: 60 * 60 * 1000 },
  ai: { limit: 30, windowMs: 60 * 60 * 1000 },
  destructiveMutation: { limit: 30, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitPolicy>;

export function rateLimitResult(count: number, policy: RateLimitPolicy, expiresAt: Date, now = new Date()): RateLimitResult {
  return {
    allowed: count <= policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    count,
  };
}
