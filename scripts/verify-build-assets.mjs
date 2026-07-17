import { readFile } from "node:fs/promises";

const traceFiles = [
  ".next/server/app/page.js.nft.json",
  ".next/server/app/[...slug]/page.js.nft.json",
  ".next/server/app/docs/page.js.nft.json",
];
const requiredAssets = [
  "site-config/site.yml",
  "site-config/navigation.yml",
  "site-config/features.yml",
  "site-config/pages/home.yml",
  "content/pages/home.md",
  "content/docs/getting-started.md",
];

const tracedFiles = new Set();
for (const traceFile of traceFiles) {
  const trace = JSON.parse(await readFile(traceFile, "utf8"));
  for (const file of trace.files) tracedFiles.add(String(file).replaceAll("\\", "/"));
}

const missing = requiredAssets.filter((asset) => ![...tracedFiles].some((file) => file.endsWith(asset)));
if (missing.length) {
  console.error(`Production build is missing traced repository assets:\n${missing.map((asset) => `- ${asset}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Production build traces all ${requiredAssets.length} required YAML/Markdown assets.`);
}
