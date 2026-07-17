import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

try {
  await access(standalone);
} catch {
  console.log("Standard Vercel build detected; standalone packaging skipped.");
  process.exit(0);
}

async function copyIfPresent(source, destination) {
  try {
    await rm(destination, { recursive: true, force: true });
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await copyIfPresent(path.join(root, "public"), path.join(standalone, "public"));
await copyIfPresent(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
await copyIfPresent(path.join(root, "content"), path.join(standalone, "content"));
await copyIfPresent(path.join(root, "site-config"), path.join(standalone, "site-config"));
console.log("Prepared .next/standalone for local or container execution.");
