import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDatabase)("PostgreSQL reminder isolation and deduplication", () => {
  let database: (typeof import("@/lib/db"))["db"];
  let tables: typeof import("@/db/schema");
  let repository: (typeof import("@/lib/drizzle-reminder-repository"))["reminderRepository"];
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const projectA = randomUUID();
  const projectB = randomUUID();
  const taskA = randomUUID();
  const taskB = randomUUID();
  const mismatchedTask = randomUUID();
  const now = new Date();
  const deadlineAt = new Date(now.getTime() + 60 * 60_000);
  const reminderAt = new Date(now.getTime() - 60_000);

  beforeAll(async () => {
    database = (await import("@/lib/db")).db;
    tables = await import("@/db/schema");
    repository = (await import("@/lib/drizzle-reminder-repository")).reminderRepository;
    await database.insert(tables.users).values([
      { id: ownerA, name: "Reminder A", email: `${ownerA}@example.test`, passwordHash: "not-used" },
      { id: ownerB, name: "Reminder B", email: `${ownerB}@example.test`, passwordHash: "not-used", emailVerifiedAt: now },
    ]);
    await database.insert(tables.projects).values([
      { id: projectA, ownerId: ownerA, title: "Owned by A" },
      { id: projectB, ownerId: ownerB, title: "Owned by B" },
    ]);
    await database.insert(tables.tasks).values([
      { id: taskA, ownerId: ownerA, projectId: projectA, title: "Task A", deadlineAt, reminderAt },
      { id: taskB, ownerId: ownerB, projectId: projectB, title: "Task B", deadlineAt, reminderAt },
      { id: mismatchedTask, ownerId: ownerA, projectId: projectB, title: "Invalid ownership relation", deadlineAt, reminderAt },
    ]);
  });

  afterAll(async () => {
    await database.delete(tables.users).where(inArray(tables.users.id, [ownerA, ownerB]));
  });

  it("keeps each reminder paired with its task owner and excludes mismatched project ownership", async () => {
    const taskIds: string[] = [taskA, taskB, mismatchedTask];
    const candidates = (await repository.listDue(now, 100)).filter((item) => taskIds.includes(item.taskId));
    expect(candidates.map((item) => [item.taskId, item.userId, item.projectTitle])).toEqual(expect.arrayContaining([
      [taskA, ownerA, "Owned by A"],
      [taskB, ownerB, "Owned by B"],
    ]));
    expect(candidates.some((item) => item.taskId === mismatchedTask)).toBe(false);
  });

  it("allows exactly one database claim for the same task and reminder time", async () => {
    const candidate = (await repository.listDue(now, 100)).find((item) => item.taskId === taskA)!;
    expect(await repository.claim(candidate)).toMatch(/[0-9a-f-]{36}/);
    expect(await repository.claim(candidate)).toBeNull();
  });
});
