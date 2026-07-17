import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL before running a Drizzle command.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
