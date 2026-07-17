import { spawn } from "node:child_process";
import path from "node:path";

const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [nextCli, "build"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_OUTPUT_MODE: "standalone" },
  });
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 1));
});

if (exitCode !== 0) process.exit(exitCode);
await import("./prepare-standalone.mjs");
