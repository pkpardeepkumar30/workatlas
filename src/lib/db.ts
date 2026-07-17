import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";

declare global {
  var workAtlasPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
}

// A warm Vercel function or local dev reload reuses this pool. Pool construction is
// lazy with respect to network I/O: pg opens a connection only when a query runs.
export const pool = global.workAtlasPool ?? createPool();
global.workAtlasPool = pool;

export const db = drizzle(pool, { schema });
