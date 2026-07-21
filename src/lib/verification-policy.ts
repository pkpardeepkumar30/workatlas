export type VerificationState = {
  emailVerificationRequired: boolean;
  emailVerifiedAt: Date | null;
};

export const NEW_ACCOUNT_VERIFICATION = {
  emailVerificationRequired: true,
  emailVerifiedAt: null,
} as const;

export function requiresEmailVerification(account: VerificationState) {
  return account.emailVerificationRequired && account.emailVerifiedAt === null;
}
