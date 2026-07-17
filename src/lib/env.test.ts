import { describe, expect, it } from "vitest";
import { deploymentEnvSchema } from "@/lib/env";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@example.test/workatlas",
  DATABASE_URL_DIRECT: "",
  SESSION_SECRET: "a-secure-session-secret-with-32-characters",
  SESSION_COOKIE_SECURE: "true",
  NEXT_PUBLIC_APP_NAME: "WorkAtlas",
  NEXT_PUBLIC_APP_URL: "https://workatlas.example.test",
  REGISTRATION_ENABLED: "false",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
};

describe("deployment environment", () => {
  it("treats empty optional values as absent", () => {
    const result = deploymentEnvSchema.parse(validEnvironment);
    expect(result.DATABASE_URL_DIRECT).toBeUndefined();
    expect(result.OPENAI_API_KEY).toBeUndefined();
    expect(result.OPENAI_MODEL).toBeUndefined();
  });

  it("rejects a short session secret", () => {
    const result = deploymentEnvSchema.safeParse({ ...validEnvironment, SESSION_SECRET: "too-short" });
    expect(result.success).toBe(false);
  });
});
