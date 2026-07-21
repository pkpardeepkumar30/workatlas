import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DataTransferRepository } from "@/lib/data-transfer-service";
import { buildExportDocument } from "@/lib/data-transfer-service";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDatabase)("PostgreSQL data transfer integration", () => {
  let database: (typeof import("@/lib/db"))["db"];
  let pool: (typeof import("@/lib/db"))["pool"];
  let tables: typeof import("@/db/schema");
  let repository: DataTransferRepository;
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const projectA = randomUUID();
  const projectB = randomUUID();
  const taskA = randomUUID();
  const commentA = randomUUID();

  beforeAll(async () => {
    const databaseModule = await import("@/lib/db");
    database = databaseModule.db;
    pool = databaseModule.pool;
    tables = await import("@/db/schema");
    repository = (await import("@/lib/drizzle-data-transfer-repository")).dataTransferRepository;
    await database.insert(tables.users).values([
      { id: ownerA, name: "Owner A", email: `${ownerA}@example.test`, passwordHash: "not-exported" },
      { id: ownerB, name: "Owner B", email: `${ownerB}@example.test`, passwordHash: "not-exported" },
    ]);
    await database.insert(tables.projects).values([
      { id: projectA, ownerId: ownerA, title: "Owner A project", description: "A", status: "active", priority: "high", tags: ["alpha"] },
      { id: projectB, ownerId: ownerB, title: "Owner B project", description: "B", status: "planned", priority: "low", tags: ["private-b"] },
    ]);
    await database.insert(tables.tasks).values({ id: taskA, ownerId: ownerA, projectId: projectA, title: "Ordered task", status: "in_progress", priority: "critical", deadlineAt: new Date("2026-08-01T12:00:00Z"), reminderMinutes: 60, reminderAt: new Date("2026-08-01T11:00:00Z"), position: 7, tags: ["ordered"] });
    await database.insert(tables.comments).values({ id: commentA, projectId: projectA, taskId: taskA, authorId: ownerA, body: "Owned comment" });
  });

  afterAll(async () => {
    await database.delete(tables.users).where(inArray(tables.users.id, [ownerA, ownerB]));
  });

  it("isolates owners and round-trips hierarchy, tags, timestamps, and Kanban position", async () => {
    const exported = await buildExportDocument({ id: ownerA, name: "Owner A", email: `${ownerA}@example.test` }, repository);
    expect(exported.projects).toHaveLength(1);
    expect(exported.projects[0].id).toBe(projectA);
    expect(exported.projects[0].tasks[0]).toMatchObject({ id: taskA, position: 7, reminderMinutes: 60, tags: ["ordered"] });
    expect(exported.projects[0].comments[0]).toMatchObject({ id: commentA, taskId: taskA });
    expect(JSON.stringify(exported)).not.toContain("Owner B project");
    expect(JSON.stringify(exported)).not.toContain("not-exported");

    const result = await repository.importDocument(ownerB, exported, "create_new", "json");
    expect(result.projects.created).toBe(1);
    expect(result.tasks.created).toBe(1);
    const copied = await database.select().from(tables.projects).where(and(eq(tables.projects.ownerId, ownerB), eq(tables.projects.title, "Owner A project")));
    expect(copied).toHaveLength(1);
    const copiedTasks = await database.select().from(tables.tasks).where(and(eq(tables.tasks.ownerId, ownerB), eq(tables.tasks.projectId, copied[0].id)));
    expect(copiedTasks[0]).toMatchObject({ position: 7, reminderMinutes: 60, tags: ["ordered"] });
    const copiedComments = await database.select().from(tables.comments).where(and(eq(tables.comments.authorId, ownerB), eq(tables.comments.projectId, copied[0].id)));
    expect(copiedComments[0].taskId).toBe(copiedTasks[0].id);
  });

  it("rolls the complete transaction back when a later record collides with another owner", async () => {
    const exported = await buildExportDocument({ id: ownerA, name: "Owner A", email: `${ownerA}@example.test` }, repository);
    const firstId = randomUUID();
    const first = structuredClone(exported.projects[0]);
    first.id = firstId;
    first.tasks = [];
    first.comments = [];
    const collision = structuredClone(first);
    collision.id = projectB;
    const malicious = { ...exported, projects: [first, collision] };

    await expect(repository.importDocument(ownerA, malicious, "update_matching", "json")).rejects.toThrow();
    const [created] = await database.select({ value: count() }).from(tables.projects).where(eq(tables.projects.id, firstId));
    expect(created.value).toBe(0);
  });

  it("preserves live row counts when the committed migration runner is repeated", async () => {
    const before = await Promise.all([
      database.select({ value: count() }).from(tables.users),
      database.select({ value: count() }).from(tables.projects),
      database.select({ value: count() }).from(tables.tasks),
      database.select({ value: count() }).from(tables.comments),
    ]);
    await migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    const after = await Promise.all([
      database.select({ value: count() }).from(tables.users),
      database.select({ value: count() }).from(tables.projects),
      database.select({ value: count() }).from(tables.tasks),
      database.select({ value: count() }).from(tables.comments),
    ]);
    expect(after).toEqual(before);
    expect(pool).toBeDefined();
  });
});
