import { z } from "zod";

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const postgresUrl = z.string().url().refine(
  (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
  "must be a PostgreSQL connection URL",
);

export const deploymentEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_DIRECT: z.preprocess(emptyToUndefined, postgresUrl.optional()),
  SESSION_SECRET: z.string().min(32, "must contain at least 32 characters"),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  REGISTRATION_ENABLED: z.enum(["true", "false"]).default("true"),
  EMAIL_PROVIDER: z.enum(["resend", "brevo"]).default("brevo"),
  RESEND_API_KEY: optionalString,
  BREVO_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  TURNSTILE_ENABLED: z.enum(["true", "false"]).default("false"),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
}).superRefine((environment, context) => {
  if (environment.TURNSTILE_ENABLED === "true") {
    if (!environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY) context.addIssue({ code: "custom", path: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"], message: "required when Turnstile is enabled" });
    if (!environment.TURNSTILE_SECRET_KEY) context.addIssue({ code: "custom", path: ["TURNSTILE_SECRET_KEY"], message: "required when Turnstile is enabled" });
  }
});

type DeploymentEnv = z.infer<typeof deploymentEnvSchema>;

function formatEnvironmentError(error: z.ZodError) {
  return `Invalid environment configuration:\n${error.issues
    .map((issue) => `- ${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("\n")}`;
}

export function validateDeploymentEnv(environment: NodeJS.ProcessEnv = process.env): DeploymentEnv {
  const result = deploymentEnvSchema.safeParse(environment);
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  if (environment.VERCEL_ENV === "production") {
    const productionIssues = [
      result.data.SESSION_COOKIE_SECURE !== "true" && "- SESSION_COOKIE_SECURE: must be true in production",
      !result.data.NEXT_PUBLIC_APP_URL.startsWith("https://") && "- NEXT_PUBLIC_APP_URL: must use HTTPS in production",
    ].filter(Boolean);
    if (productionIssues.length) throw new Error(`Invalid production environment configuration:\n${productionIssues.join("\n")}`);
  }
  return result.data;
}

export function getDatabaseUrl() {
  const result = postgresUrl.safeParse(process.env.DATABASE_URL);
  if (!result.success) throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  return withVerifiedTls(result.data);
}

export function getMigrationDatabaseUrl() {
  const result = postgresUrl.safeParse(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);
  if (!result.success) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL must be a valid PostgreSQL connection URL.");
  return withVerifiedTls(result.data);
}

function withVerifiedTls(value: string) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

export function getAuthEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const result = z.object({
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
    SESSION_COOKIE_SECURE: z.enum(["true", "false"]).default(environment.NODE_ENV === "production" ? "true" : "false"),
    REGISTRATION_ENABLED: z.enum(["true", "false"]).default("true"),
  }).safeParse(environment);
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  const production = environment.VERCEL_ENV === "production" || environment.NODE_ENV === "production";
  const localPreview = environment.WORKATLAS_LOCAL_PREVIEW === "true"
    && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(environment.NEXT_PUBLIC_APP_URL || "");
  if (production && result.data.SESSION_COOKIE_SECURE !== "true" && !localPreview) {
    throw new Error("Invalid production environment configuration:\n- SESSION_COOKIE_SECURE: must be true in production");
  }
  return {
    sessionSecret: result.data.SESSION_SECRET,
    secureCookie: result.data.SESSION_COOKIE_SECURE === "true",
    registrationEnabled: result.data.REGISTRATION_ENABLED === "true",
  };
}

export function getEmailEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const result = z.object({
    EMAIL_PROVIDER: z.enum(["resend", "brevo"]).default("brevo"),
    RESEND_API_KEY: optionalString,
    BREVO_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    NEXT_PUBLIC_APP_URL: z.string().url(),
  }).safeParse(environment);
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  return result.data;
}

export function getTurnstileEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const result = z.object({
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
    TURNSTILE_ENABLED: z.enum(["true", "false"]).default("false"),
  }).safeParse(environment);
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  const enabled = result.data.TURNSTILE_ENABLED === "true";
  if (enabled && (!result.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !result.data.TURNSTILE_SECRET_KEY)) {
    throw new Error("Turnstile requires NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.");
  }
  return { enabled, siteKey: result.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY, secretKey: result.data.TURNSTILE_SECRET_KEY };
}

export function getOpenAIEnvironment() {
  return {
    apiKey: process.env.OPENAI_API_KEY || undefined,
    model: process.env.OPENAI_MODEL || "gpt-5.6",
  };
}

export function getReminderEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const result = z.object({ CRON_SECRET: z.string().min(32).optional() }).safeParse({
    CRON_SECRET: environment.CRON_SECRET || undefined,
  });
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  return { cronSecret: result.data.CRON_SECRET };
}
