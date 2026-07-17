import type { KanbanOrderItem, ProjectInput, TaskInput } from "@/lib/mutation-schemas";

export type OwnedTask = { id: string; projectId: string; status: TaskInput["status"] };

export interface MutationRepository {
  findOwnedProject(ownerId: string, projectId: string): Promise<{ id: string } | null>;
  findOwnedTask(ownerId: string, taskId: string): Promise<OwnedTask | null>;
  findOwnedTaskIds(ownerId: string, taskIds: string[]): Promise<string[]>;
  countProjectTasks(ownerId: string, projectId: string): Promise<number>;
  nextTaskPosition(ownerId: string, status: TaskInput["status"]): Promise<number>;
  createTask(ownerId: string, input: TaskInput): Promise<{ id: string }>;
  updateProject(ownerId: string, projectId: string, input: ProjectInput): Promise<boolean>;
  updateTask(ownerId: string, taskId: string, input: TaskInput & { position?: number }): Promise<boolean>;
  deleteProject(ownerId: string, projectId: string): Promise<boolean>;
  deleteTask(ownerId: string, taskId: string): Promise<boolean>;
  persistTaskOrder(ownerId: string, items: KanbanOrderItem[]): Promise<void>;
}

export class MutationError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT",
  ) {
    super(message);
    this.name = "MutationError";
  }
}

function inaccessible(entity: "Project" | "Task") {
  return new MutationError(`${entity} was not found or you do not have permission to change it.`, "FORBIDDEN");
}

export async function createOwnedTask(repository: MutationRepository, ownerId: string, input: TaskInput) {
  if (!(await repository.findOwnedProject(ownerId, input.projectId))) throw inaccessible("Project");
  return repository.createTask(ownerId, input);
}

export async function updateOwnedProject(
  repository: MutationRepository,
  ownerId: string,
  projectId: string,
  input: ProjectInput,
) {
  if (!(await repository.findOwnedProject(ownerId, projectId))) throw inaccessible("Project");
  if (!(await repository.updateProject(ownerId, projectId, input))) throw inaccessible("Project");
}

export async function deleteOwnedProject(repository: MutationRepository, ownerId: string, projectId: string) {
  if (!(await repository.findOwnedProject(ownerId, projectId))) throw inaccessible("Project");
  const taskCount = await repository.countProjectTasks(ownerId, projectId);
  if (!(await repository.deleteProject(ownerId, projectId))) throw inaccessible("Project");
  return { taskCount };
}

export async function updateOwnedTask(
  repository: MutationRepository,
  ownerId: string,
  taskId: string,
  input: TaskInput,
) {
  const task = await repository.findOwnedTask(ownerId, taskId);
  if (!task) throw inaccessible("Task");
  if (!(await repository.findOwnedProject(ownerId, input.projectId))) throw inaccessible("Project");
  const position = task.status === input.status ? undefined : await repository.nextTaskPosition(ownerId, input.status);
  if (!(await repository.updateTask(ownerId, taskId, { ...input, position }))) throw inaccessible("Task");
}

export async function deleteOwnedTask(repository: MutationRepository, ownerId: string, taskId: string) {
  if (!(await repository.findOwnedTask(ownerId, taskId))) throw inaccessible("Task");
  if (!(await repository.deleteTask(ownerId, taskId))) throw inaccessible("Task");
}

export async function persistOwnedKanbanOrder(
  repository: MutationRepository,
  ownerId: string,
  items: KanbanOrderItem[],
) {
  if (items.length === 0) return;
  const requestedIds = new Set(items.map((item) => item.id));
  const ownedIds = await repository.findOwnedTaskIds(ownerId, [...requestedIds]);
  if (ownedIds.length !== requestedIds.size || ownedIds.some((id) => !requestedIds.has(id))) {
    throw new MutationError("One or more tasks were not found or are not owned by you.", "FORBIDDEN");
  }
  await repository.persistTaskOrder(ownerId, items);
}
