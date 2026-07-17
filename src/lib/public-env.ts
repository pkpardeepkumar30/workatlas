import { z } from "zod";

export function getPublicEnvironment() {
  const result = z.object({
    NEXT_PUBLIC_APP_NAME: z.string().min(1).default("WorkAtlas"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  }).safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!result.success) {
    throw new Error(`Invalid public environment configuration: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`);
  }
  return { appName: result.data.NEXT_PUBLIC_APP_NAME, appUrl: result.data.NEXT_PUBLIC_APP_URL };
}
