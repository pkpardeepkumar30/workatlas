import { describe, expect, it, vi } from "vitest";
import { createDeliverablePendingAccount, type PendingRegistrationAccount, type RegistrationEffects } from "@/lib/registration-service";

const account: PendingRegistrationAccount = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "New user",
  email: "new@example.test",
  role: "member",
  emailVerifiedAt: null,
  emailVerificationRequired: true,
};

function effects(overrides: Partial<RegistrationEffects> = {}): RegistrationEffects {
  return {
    createPendingAccount: vi.fn().mockResolvedValue(account),
    issueVerificationToken: vi.fn().mockResolvedValue("secure-token"),
    sendVerification: vi.fn().mockResolvedValue(true),
    removePendingAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("registration verification delivery", () => {
  it("keeps the account only after its first verification message is accepted", async () => {
    const operations = effects();
    await expect(createDeliverablePendingAccount(operations)).resolves.toBe(account);
    expect(operations.removePendingAccount).not.toHaveBeenCalled();
  });

  it("removes a pending account when the provider rejects delivery", async () => {
    const operations = effects({ sendVerification: vi.fn().mockResolvedValue(false) });
    await expect(createDeliverablePendingAccount(operations)).rejects.toThrow(/delivery failed/i);
    expect(operations.removePendingAccount).toHaveBeenCalledWith(account.id);
  });

  it("removes a pending account when token creation or delivery throws", async () => {
    const operations = effects({ sendVerification: vi.fn().mockRejectedValue(new Error("provider details")) });
    await expect(createDeliverablePendingAccount(operations)).rejects.toThrow("provider details");
    expect(operations.removePendingAccount).toHaveBeenCalledWith(account.id);
  });
});
