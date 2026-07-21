import { createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { emailVerificationTokens, passwordResetTokens, sessions, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getAuthEnvironment } from "@/lib/env";
import { applyPasswordResetEffects, PASSWORD_HASH_ROUNDS, passwordSchema } from "@/lib/security-token-rules";

const EMAIL_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

export function hashSecurityToken(token: string) {
  return createHmac("sha256", getAuthEnvironment().sessionSecret).update(`security-token:${token}`).digest("hex");
}

function issueToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSecurityToken(token) };
}

export async function createEmailVerificationToken(userId: string, now = new Date()) {
  const issued = issueToken();
  await db.transaction(async (transaction) => {
    await transaction.update(emailVerificationTokens).set({ consumedAt: now })
      .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.consumedAt)));
    await transaction.insert(emailVerificationTokens).values({
      userId,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(now.getTime() + EMAIL_TOKEN_LIFETIME_MS),
    });
  });
  return issued.token;
}

export async function consumeEmailVerificationToken(token: string, now = new Date()) {
  const tokenHash = hashSecurityToken(token);
  return db.transaction(async (transaction) => {
    const [claimed] = await transaction.update(emailVerificationTokens)
      .set({ consumedAt: now })
      .where(and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.consumedAt),
        gt(emailVerificationTokens.expiresAt, now),
      ))
      .returning({ userId: emailVerificationTokens.userId });
    if (!claimed) return false;
    await transaction.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, claimed.userId));
    return true;
  });
}

export async function createPasswordResetToken(userId: string, now = new Date()) {
  const issued = issueToken();
  await db.transaction(async (transaction) => {
    await transaction.update(passwordResetTokens).set({ consumedAt: now })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.consumedAt)));
    await transaction.insert(passwordResetTokens).values({
      userId,
      tokenHash: issued.tokenHash,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_LIFETIME_MS),
    });
  });
  return issued.token;
}

export async function resetPasswordWithToken(token: string, password: string, now = new Date()) {
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) return { ok: false as const, error: parsedPassword.error.issues[0]?.message ?? "Invalid password." };
  const passwordHash = await bcrypt.hash(parsedPassword.data, PASSWORD_HASH_ROUNDS);
  const tokenHash = hashSecurityToken(token);
  return db.transaction(async (transaction) => {
    const [claimed] = await transaction.update(passwordResetTokens)
      .set({ consumedAt: now })
      .where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.consumedAt),
        gt(passwordResetTokens.expiresAt, now),
      ))
      .returning({ userId: passwordResetTokens.userId });
    if (!claimed) return { ok: false as const, error: "This reset link is invalid, expired, or has already been used." };
    await applyPasswordResetEffects({
      async updatePassword(userId, nextPasswordHash, updatedAt) {
        await transaction.update(users).set({ passwordHash: nextPasswordHash, updatedAt }).where(eq(users.id, userId));
      },
      async invalidateSessions(userId) {
        await transaction.delete(sessions).where(eq(sessions.userId, userId));
      },
    }, claimed.userId, passwordHash, now);
    return { ok: true as const };
  });
}
