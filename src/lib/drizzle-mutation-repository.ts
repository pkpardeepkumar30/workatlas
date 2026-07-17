import { and, count, eq, inArray, max } from "drizzle-orm";
import { projects, tasks } from "@/db/schema";
import type { MutationRepository } from "@/lib/mutation-service";
import type { KanbanOrderItem, ProjectInput, TaskInput } from "@/lib/mutation-schemas";
import { db } from "@/lib/db";

export const mutationRepository: MutationRepository = {
  async findOwnedProject(ownerId, projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId))).limit(1);
    return project ?? null;
  },

  async findOwnedTask(ownerId, taskId) {
    const [task] = await db.select({ id: tasks.id, projectId: tasks.projectId, status: tasks.status }).from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId))).limit(1);
    return task ?? null;
  },

  async findOwnedTaskIds(ownerId, taskIds) {
    if (taskIds.length === 0) return [];
    const rows = await db.select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), inArray(tasks.id, taskIds)));
    return rows.map((row) => row.id);
  },

  async countProjectTasks(ownerId, projectId) {
    const [result] = await db.select({ value: count() }).from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), eq(tasks.projectId, projectId)));
    return result?.value ?? 0;
  },

  async nextTaskPosition(ownerId, status) {
    const [result] = await db.select({ value: max(tasks.position) }).from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), eq(tasks.status, status)));
    return (result?.value ?? -1) + 1;
  },

  async createTask(ownerId, input) {
    return db.transaction(async (transaction) => {
      const [result] = await transaction.select({ value: max(tasks.position) }).from(tasks)
        .where(and(eq(tasks.ownerId, ownerId), eq(tasks.status, input.status)));
      const [task] = await transaction.insert(tasks).values({ ownerId, ...input, position: (result?.value ?? -1) + 1 }).returning({ id: tasks.id });
      await transaction.update(projects).set({ updatedAt: new Date() })
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)));
      return task;
    });
  },

  async updateProject(ownerId, projectId, input: ProjectInput) {
    const result = await db.update(projects).set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
    return Boolean(result.rowCount);
  },

  async updateTask(ownerId, taskId, input: TaskInput & { position?: number }) {
    const result = await db.update(tasks).set({ ...input, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
    return Boolean(result.rowCount);
  },

  async deleteProject(ownerId, projectId) {
    const result = await db.delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
    return Boolean(result.rowCount);
  },

  async deleteTask(ownerId, taskId) {
    const result = await db.delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
    return Boolean(result.rowCount);
  },

  async persistTaskOrder(ownerId, items: KanbanOrderItem[]) {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        const result = await transaction.update(tasks)
          .set({ status: item.status, position: item.position, updatedAt: new Date() })
          .where(and(eq(tasks.id, item.id), eq(tasks.ownerId, ownerId)));
        if (!result.rowCount) throw new Error("A task changed while the board was being saved.");
      }
    });
  },
};
