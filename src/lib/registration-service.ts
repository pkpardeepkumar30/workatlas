export type PendingRegistrationAccount = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  emailVerifiedAt: Date | null;
  emailVerificationRequired: boolean;
};

export interface RegistrationEffects {
  createPendingAccount(): Promise<PendingRegistrationAccount>;
  issueVerificationToken(userId: string): Promise<string>;
  sendVerification(account: PendingRegistrationAccount, token: string): Promise<boolean>;
  removePendingAccount(userId: string): Promise<void>;
}

export class VerificationDeliveryError extends Error {
  constructor() {
    super("Verification email delivery failed.");
  }
}

export async function createDeliverablePendingAccount(effects: RegistrationEffects) {
  let account: PendingRegistrationAccount | null = null;
  try {
    account = await effects.createPendingAccount();
    const token = await effects.issueVerificationToken(account.id);
    if (!(await effects.sendVerification(account, token))) throw new VerificationDeliveryError();
    return account;
  } catch (error) {
    if (account) {
      try {
        await effects.removePendingAccount(account.id);
      } catch {
        // Preserve the delivery error and avoid logging account or provider data.
      }
    }
    throw error;
  }
}
