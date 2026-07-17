import fs from "node:fs/promises";
import path from "node:path";
import { assertMigrationIsForwardOnly } from "../src/lib/migration-safety";

async function main() {
  const directory = path.join(process.cwd(), "drizzle");
  const filenames = (await fs.readdir(directory)).filter((filename) => /^\d+_.+\.sql$/.test(filename)).sort();
  for (const filename of filenames) {
    assertMigrationIsForwardOnly(filename, await fs.readFile(path.join(directory, filename), "utf8"));
  }
  console.log(`Migration safety valid: ${filenames.length} committed forward-only migration(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
