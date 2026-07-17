import { describe, expect, it, vi } from "vitest";
import {
  createOwnedTask,
  deleteOwnedProject,
  deleteOwnedTask,
  persistOwnedKanbanOrder,
  updateOwnedProject,
  updateOwnedTask,
  type MutationRepository,
} from "@/lib/mutation-service";
import { kanbanOrderSchema, type ProjectInput, type TaskInput } from "@/lib/mutation-schemas";

const ownerId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const secondProjectId = "00000000-0000-4000-8000-000000000003";
const taskId = "00000000-0000-4000-8000-000000000004";
const secondTaskId = "00000000-0000-4000-8000-000000000005";

const projectInput: ProjectInput = {
  title: "Updated project",
  description: "Updated description",
  area: "Engineering",
  status: "active",
  priority: "high",
  nextAction: "Run validation",
  targetDate: "2026-08-01",
};

const taskInput: TaskInput = {
  projectId,
  title: "Updated task",
  description: "Task details",
  status: "in_progress",
  priority: "critical",
  dueDate: "2026-07-30",
};

function repository(overrides: Partial<MutationRepository> = {}): MutationRepository {
  return {
    findOwnedProject: vi.fn(async () => ({ id: projectId })),
    findOwnedTask: vi.fn(async () => ({ id: taskId, projectId, status: "todo" as const })),
    findOwnedTaskIds: vi.fn(async (_ownerId, ids) => ids),
    countProjectTasks: vi.fn(async () => 2),
    nextTaskPosition: vi.fn(async () => 4),
    createTask: vi.fn(async () => ({ id: taskId })),
    updateProject: vi.fn(async () => true),
    updateTask: vi.fn(async () => true),
    deleteProject: vi.fn(async () => true),
    deleteTask: vi.fn(async () => true),
    persistTaskOrder: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("project mutations", () => {
  it("updates only after confirming project ownership", async () => {
    const repo = repository();
    await updateOwnedProject(repo, ownerId, projectId, projectInput);
    expect(repo.findOwnedProject).toHaveBeenCalledWith(ownerId, projectId);
    expect(repo.updateProject).toHaveBeenCalledWith(ownerId, projectId, projectInput);
  });

  it("rejects an update when the project is not owned", async () => {
    const repo = repository({ findOwnedProject: vi.fn(async () => null) });
    await expect(updateOwnedProject(repo, ownerId, projectId, projectInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.updateProject).not.toHaveBeenCalled();
  });

  it("deletes an owned project and reports its cascading task count", async () => {
    const repo = repository();
    await expect(deleteOwnedProject(repo, ownerId, projectId)).resolves.toEqual({ taskCount: 2 });
    expect(repo.countProjectTasks).toHaveBeenCalledWith(ownerId, projectId);
    expect(repo.deleteProject).toHaveBeenCalledWith(ownerId, projectId);
  });
});

describe("task mutations", () => {
  it("creates a task with the selected owned project association", async () => {
    const repo = repository();
    await expect(createOwnedTask(repo, ownerId, taskInput)).resolves.toEqual({ id: taskId });
    expect(repo.findOwnedProject).toHaveBeenCalledWith(ownerId, projectId);
    expect(repo.createTask).toHaveBeenCalledWith(ownerId, taskInput);
  });

  it("rejects project-level task creation when the project is not owned", async () => {
    const repo = repository({ findOwnedProject: vi.fn(async () => null) });
    await expect(createOwnedTask(repo, ownerId, taskInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.createTask).not.toHaveBeenCalled();
  });
  it("updates all editable fields and assigns the end position after a status change", async () => {
    const repo = repository();
    await updateOwnedTask(repo, ownerId, taskId, taskInput);
    expect(repo.findOwnedTask).toHaveBeenCalledWith(ownerId, taskId);
    expect(repo.findOwnedProject).toHaveBeenCalledWith(ownerId, projectId);
    expect(repo.updateTask).toHaveBeenCalledWith(ownerId, taskId, { ...taskInput, position: 4 });
  });

  it("rejects reassignment to a project the user does not own", async () => {
    const repo = repository({
      findOwnedProject: vi.fn(async (_owner, id) => id === secondProjectId ? null : { id }),
    });
    await expect(updateOwnedTask(repo, ownerId, taskId, { ...taskInput, projectId: secondProjectId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.updateTask).not.toHaveBeenCalled();
  });

  it("enforces ownership before deleting a task", async () => {
    const denied = repository({ findOwnedTask: vi.fn(async () => null) });
    await expect(deleteOwnedTask(denied, ownerId, taskId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(denied.deleteTask).not.toHaveBeenCalled();

    const allowed = repository();
    await deleteOwnedTask(allowed, ownerId, taskId);
    expect(allowed.deleteTask).toHaveBeenCalledWith(ownerId, taskId);
  });
});

describe("Kanban persistence", () => {
  const order = [
    { id: taskId, status: "todo" as const, position: 0 },
    { id: secondTaskId, status: "in_progress" as const, position: 0 },
  ];

  it("persists validated status and position values for owned tasks", async () => {
    expect(kanbanOrderSchema.safeParse(order).success).toBe(true);
    const repo = repository();
    await persistOwnedKanbanOrder(repo, ownerId, order);
    expect(repo.findOwnedTaskIds).toHaveBeenCalledWith(ownerId, [taskId, secondTaskId]);
    expect(repo.persistTaskOrder).toHaveBeenCalledWith(ownerId, order);
  });

  it("refuses the whole reorder if any task is not owned", async () => {
    const repo = repository({ findOwnedTaskIds: vi.fn(async () => [taskId]) });
    await expect(persistOwnedKanbanOrder(repo, ownerId, order)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.persistTaskOrder).not.toHaveBeenCalled();
  });

  it("rejects duplicate or unstable positions", () => {
    const invalid = [
      { id: taskId, status: "todo", position: 0 },
      { id: secondTaskId, status: "todo", position: 0 },
    ];
    expect(kanbanOrderSchema.safeParse(invalid).success).toBe(false);
  });
});
