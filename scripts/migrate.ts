import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { getMigrationDatabaseUrl } from "../src/lib/env";
import fs from "node:fs/promises";
import { assertMigrationIsForwardOnly } from "../src/lib/migration-safety";

async function main() {
  const migrationDirectory = path.join(process.cwd(), "drizzle");
  const migrationFiles = (await fs.readdir(migrationDirectory)).filter((filename) => /^\d+_.+\.sql$/.test(filename));
  for (const filename of migrationFiles) {
    assertMigrationIsForwardOnly(filename, await fs.readFile(path.join(migrationDirectory, filename), "utf8"));
  }
  const pool = new Pool({
    connectionString: getMigrationDatabaseUrl(),
    max: 1,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  });

  try {
    console.log("Applying committed Drizzle migrations using the administrative database connection…");
    await migrate(drizzle(pool), { migrationsFolder: migrationDirectory });
    console.log("Database migrations completed.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
