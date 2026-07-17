import { z } from "zod";

export function getPublicEnvironment() {
  const result = z.object({
    NEXT_PUBLIC_APP_NAME: z.string().min(1).default("WorkAtlas"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    TURNSTILE_ENABLED: z.enum(["true", "false"]).default("false"),
  }).safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
    TURNSTILE_ENABLED: process.env.TURNSTILE_ENABLED,
  });
  if (!result.success) {
    throw new Error(`Invalid public environment configuration: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`);
  }
  return {
    appName: result.data.NEXT_PUBLIC_APP_NAME,
    appUrl: result.data.NEXT_PUBLIC_APP_URL,
    turnstileSiteKey: result.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    turnstileEnabled: result.data.TURNSTILE_ENABLED === "true" && Boolean(result.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  };
}
