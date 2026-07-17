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
      !result.data.DATABASE_URL_DIRECT && "- DATABASE_URL_DIRECT: required for production migrations",
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
  return result.data;
}

export function getMigrationDatabaseUrl() {
  const result = postgresUrl.safeParse(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);
  if (!result.success) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL must be a valid PostgreSQL connection URL.");
  return result.data;
}

export function getAuthEnvironment() {
  const result = z.object({
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
    SESSION_COOKIE_SECURE: z.enum(["true", "false"]).default(process.env.NODE_ENV === "production" ? "true" : "false"),
    REGISTRATION_ENABLED: z.enum(["true", "false"]).default("true"),
  }).safeParse(process.env);
  if (!result.success) throw new Error(formatEnvironmentError(result.error));
  return {
    sessionSecret: result.data.SESSION_SECRET,
    secureCookie: result.data.SESSION_COOKIE_SECURE === "true",
    registrationEnabled: result.data.REGISTRATION_ENABLED === "true",
  };
}

export function getOpenAIEnvironment() {
  return {
    apiKey: process.env.OPENAI_API_KEY || undefined,
    model: process.env.OPENAI_MODEL || "gpt-5.6",
  };
}
