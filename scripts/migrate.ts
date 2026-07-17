import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { getMigrationDatabaseUrl } from "../src/lib/env";

async function main() {
  const pool = new Pool({
    connectionString: getMigrationDatabaseUrl(),
    max: 1,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  });

  try {
    console.log("Applying committed Drizzle migrations using the administrative database connection…");
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
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
