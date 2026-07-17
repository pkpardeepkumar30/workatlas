import { describe, expect, it } from "vitest";
import { deploymentEnvSchema, getAuthEnvironment, validateDeploymentEnv } from "@/lib/env";

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

  it("rejects insecure cookies in production", () => {
    expect(() => getAuthEnvironment({
      SESSION_SECRET: validEnvironment.SESSION_SECRET,
      SESSION_COOKIE_SECURE: "false",
      REGISTRATION_ENABLED: "true",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    })).toThrow(/SESSION_COOKIE_SECURE/);
  });

  it("does not require the administrative migration URL in the Vercel runtime", () => {
    expect(validateDeploymentEnv({ ...validEnvironment, DATABASE_URL_DIRECT: "", VERCEL_ENV: "production", NODE_ENV: "production" }).DATABASE_URL_DIRECT).toBeUndefined();
  });

  it("allows insecure cookies only for the explicit localhost production preview", () => {
    expect(getAuthEnvironment({
      SESSION_SECRET: validEnvironment.SESSION_SECRET,
      SESSION_COOKIE_SECURE: "false",
      REGISTRATION_ENABLED: "true",
      NODE_ENV: "production",
      WORKATLAS_LOCAL_PREVIEW: "true",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }).secureCookie).toBe(false);

    expect(() => getAuthEnvironment({
      SESSION_SECRET: validEnvironment.SESSION_SECRET,
      SESSION_COOKIE_SECURE: "false",
      REGISTRATION_ENABLED: "true",
      NODE_ENV: "production",
      WORKATLAS_LOCAL_PREVIEW: "true",
      NEXT_PUBLIC_APP_URL: "https://workatlas.example.test",
    })).toThrow(/SESSION_COOKIE_SECURE/);
  });

  it("keeps public registration enabled when configured", () => {
    expect(getAuthEnvironment({
      SESSION_SECRET: validEnvironment.SESSION_SECRET,
      SESSION_COOKIE_SECURE: "true",
      REGISTRATION_ENABLED: "true",
      NODE_ENV: "test",
    }).registrationEnabled).toBe(true);
  });
});
