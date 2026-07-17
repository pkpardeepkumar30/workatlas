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
if (application.protocol !== "https:") {
  fail("NEXT_PUBLIC_APP_URL must use HTTPS.");
}
if (application.username || application.password || application.search || application.hash) {
  fail("NEXT_PUBLIC_APP_URL must be a plain public application URL.");
}

console.log(`Production release configuration is valid for ${application.origin}.`);
