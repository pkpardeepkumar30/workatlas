import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertMigrationIsForwardOnly, findUnsafeMigrationStatements } from "@/lib/migration-safety";

describe("production migration data preservation", () => {
  const migrationDirectory = path.join(process.cwd(), "drizzle");
  const migrationFiles = fs.readdirSync(migrationDirectory).filter((filename) => /^\d+_.+\.sql$/.test(filename));

  it("keeps every committed migration forward-only without data erasure or reseeding", () => {
    for (const filename of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationDirectory, filename), "utf8");
      expect(findUnsafeMigrationStatements(sql), filename).toEqual([]);
    }
  });

  it("rejects reset, truncate, delete, drop, rename, destructive type changes, and live-data seed SQL", () => {
    const unsafe = [
      "DROP TABLE users", "TRUNCATE tasks", "DELETE FROM projects", "ALTER TABLE tasks DROP COLUMN title",
      "ALTER TABLE tasks ALTER COLUMN position TYPE text", "ALTER TABLE projects RENAME TO old_projects",
      "INSERT INTO users (email) VALUES ('x')",
    ];
    for (const sql of unsafe) expect(() => assertMigrationIsForwardOnly("unsafe.sql", sql)).toThrow(/Unsafe migration/);
  });

  it("adds portability storage without replacing existing live tables", () => {
    const sql = migrationFiles.map((filename) => fs.readFileSync(path.join(migrationDirectory, filename), "utf8"))
      .find((migration) => migration.includes('CREATE TABLE "data_transfer_audit_logs"'))!;
    expect(sql).toContain('CREATE TABLE "data_transfer_audit_logs"');
    expect(sql).toContain('ALTER TABLE "projects" ADD COLUMN "tags"');
    expect(sql).toContain('ALTER TABLE "tasks" ADD COLUMN "tags"');
    expect(sql).not.toMatch(/DROP|TRUNCATE|DELETE\s+FROM/i);
  });

  it("adds verification and reminders without modifying existing account, project, or task rows", () => {
    const newest = migrationFiles.sort().at(-1)!;
    const sql = fs.readFileSync(path.join(migrationDirectory, newest), "utf8");
    expect(sql).toContain('CREATE TABLE "task_reminder_notifications"');
    expect(sql).toContain('ALTER TABLE "tasks" ADD COLUMN "deadline_at"');
    expect(sql).toContain('ALTER TABLE "users" ADD COLUMN "email_verification_required" boolean DEFAULT false NOT NULL');
    expect(sql).not.toMatch(/UPDATE\s+"?(users|projects|tasks)"?|DROP|TRUNCATE|DELETE\s+FROM/i);
  });
});
