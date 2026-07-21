import { describe, expect, it } from "vitest";
import { NEW_ACCOUNT_VERIFICATION, requiresEmailVerification } from "@/lib/verification-policy";

describe("email verification policy", () => {
  it("requires verification for every new account", () => {
    expect(requiresEmailVerification(NEW_ACCOUNT_VERIFICATION)).toBe(true);
  });

  it("does not lock existing grandfathered accounts", () => {
    expect(requiresEmailVerification({ emailVerificationRequired: false, emailVerifiedAt: null })).toBe(false);
  });

  it("allows a verification-required account after verification", () => {
    expect(requiresEmailVerification({ emailVerificationRequired: true, emailVerifiedAt: new Date() })).toBe(false);
  });
});
