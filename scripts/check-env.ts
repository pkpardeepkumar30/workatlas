import { validateDeploymentEnv } from "../src/lib/env";

try {
  validateDeploymentEnv();
  console.log("Deployment environment variables are valid.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Environment validation failed.");
  process.exitCode = 1;
}
