import pg from "pg";

const { Pool } = pg;

function fail(message) {
  console.error(`Production release configuration error: ${message}`);
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL_DIRECT;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!directUrl) fail("DATABASE_URL_DIRECT is missing from .env.release.local.");
if (!appUrl) fail("NEXT_PUBLIC_APP_URL is missing from .env.release.local.");

let database;
let application;
try {
  database = new URL(directUrl);
} catch {
  fail("DATABASE_URL_DIRECT is not a valid URL.");
}
try {
  application = new URL(appUrl);
} catch {
  fail("NEXT_PUBLIC_APP_URL is not a valid URL.");
}

if (!["postgres:", "postgresql:"].includes(database.protocol)) {
  fail("DATABASE_URL_DIRECT must be a PostgreSQL URL.");
}
if (["localhost", "127.0.0.1"].includes(database.hostname)) {
  fail("DATABASE_URL_DIRECT points to the local database, not Neon.");
}
if (database.hostname.includes("-pooler")) {
  fail("DATABASE_URL_DIRECT must use Neon's direct hostname, not the -pooler hostname.");
}
if (!database.hostname.endsWith(".neon.tech")) {
  fail("DATABASE_URL_DIRECT must point to a Neon .neon.tech hostname.");
}
if (database.searchParams.get("sslmode") !== "verify-full") {
  fail("DATABASE_URL_DIRECT must use sslmode=verify-full so server certificates remain fully verified.");
}
if (application.protocol !== "https:") {
  fail("NEXT_PUBLIC_APP_URL must use HTTPS.");
}
if (application.username || application.password || application.search || application.hash) {
  fail("NEXT_PUBLIC_APP_URL must be a plain public application URL.");
}

const pool = new Pool({ connectionString: directUrl, max: 1, connectionTimeoutMillis: 15_000, allowExitOnIdle: true });
let databaseFailure;
try {
  const result = await pool.query("select has_database_privilege(current_user, current_database(), 'CREATE') as can_create");
  if (!result.rows[0]?.can_create) databaseFailure = "the configured role cannot create the Drizzle migration schema";
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? ` (${error.code})` : "";
  const message = error instanceof Error ? error.message : "connection failed";
  databaseFailure = `${message}${code}`;
} finally {
  await pool.end();
}
if (databaseFailure) fail(`Neon connection check failed: ${databaseFailure}. Copy a current direct connection string from Neon.`);

console.log(`Production release configuration and Neon migration access are valid for ${application.origin}.`);
