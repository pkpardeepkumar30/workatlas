import { z } from "zod";

export const passwordSchema = z.string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export type TokenRecord = { expiresAt: Date; consumedAt: Date | null };
export interface PasswordResetEffects {
  updatePassword(userId: string, passwordHash: string, now: Date): Promise<void>;
  invalidateSessions(userId: string): Promise<void>;
}

export function tokenRecordStatus(record: TokenRecord | null, now = new Date()) {
  if (!record) return "invalid" as const;
  if (record.consumedAt) return "consumed" as const;
  if (record.expiresAt <= now) return "expired" as const;
  return "valid" as const;
}

export async function applyPasswordResetEffects(effects: PasswordResetEffects, userId: string, passwordHash: string, now: Date) {
  await effects.updatePassword(userId, passwordHash, now);
  await effects.invalidateSessions(userId);
}
