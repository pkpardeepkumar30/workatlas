"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mutationRepository } from "@/lib/drizzle-mutation-repository";
import type { MutationActionState } from "@/lib/action-state";
import {
  createOwnedTask,
  deleteOwnedProject,
  deleteOwnedTask,
  persistOwnedKanbanOrder,
  updateOwnedProject,
  updateOwnedTask,
  MutationError,
} from "@/lib/mutation-service";
import { entityIdSchema, kanbanOrderSchema, projectInputSchema, taskInputSchema } from "@/lib/mutation-schemas";
import { enforceRateLimit, RateLimitError, rateLimitPolicies } from "@/lib/rate-limit";

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function projectValues(formData: FormData) {
  return {
    title: stringValue(formData, "title"),
    description: stringValue(formData, "description"),
    area: stringValue(formData, "area") || "General",
    status: stringValue(formData, "status") || "idea",
    priority: stringValue(formData, "priority") || "medium",
    nextAction: stringValue(formData, "nextAction"),
    targetDate: stringValue(formData, "targetDate"),
  };
}

function taskValues(formData: FormData) {
  return {
    projectId: stringValue(formData, "projectId"),
    title: stringValue(formData, "title"),
    description: stringValue(formData, "description"),
    status: stringValue(formData, "status") || "todo",
    priority: stringValue(formData, "priority") || "medium",
    dueDate: stringValue(formData, "dueDate"),
  };
}

function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "value"}: ${issue.message}` : "Invalid input.";
}

function errorState(error: unknown): MutationActionState {
  if (error instanceof MutationError || error instanceof RateLimitError || error instanceof z.ZodError) {
    return { status: "error", message: error.message };
  }
  console.error("Server mutation failed", error);
  return { status: "error", message: "The operation could not be completed. Please try again." };
}

function revalidateTaskViews(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/kanban");
  revalidatePath("/dashboard/review");
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
}

function revalidateProjectViews(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/ideas");
  revalidatePath("/dashboard/review");
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const parsed = projectInputSchema.safeParse(projectValues(formData));
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  await db.insert(projects).values({ ownerId: user.id, ...parsed.data });
  revalidateProjectViews();
}

export async function createIdea(formData: FormData) {
  formData.set("status", "idea");
  formData.set("priority", formData.get("priority") || "medium");
  await createProject(formData);
}

export async function createTask(formData: FormData) {
  const result = await createTaskAction({ status: "idle", message: "" }, formData);
  if (result.status === "error") throw new Error(result.message);
}

export async function createTaskAction(
  _previousState: MutationActionState,
  formData: FormData,
): Promise<MutationActionState> {
  try {
    const user = await requireUser();
    const parsed = taskInputSchema.safeParse(taskValues(formData));
    if (!parsed.success) return { status: "error", message: validationMessage(parsed.error) };
    await createOwnedTask(mutationRepository, user.id, parsed.data);
    revalidateTaskViews(parsed.data.projectId);
    return { status: "success", message: "Task created successfully." };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateProjectAction(
  _previousState: MutationActionState,
  formData: FormData,
): Promise<MutationActionState> {
  try {
    const user = await requireUser();
    const projectId = entityIdSchema.parse(stringValue(formData, "projectId"));
    const input = projectInputSchema.safeParse(projectValues(formData));
    if (!input.success) return { status: "error", message: validationMessage(input.error) };
    await updateOwnedProject(mutationRepository, user.id, projectId, input.data);
    revalidateProjectViews(projectId);
    return { status: "success", message: "Project updated successfully." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteProjectAction(
  _previousState: MutationActionState,
  formData: FormData,
): Promise<MutationActionState> {
  try {
    const user = await requireUser();
    await enforceRateLimit("delete-project", user.id, rateLimitPolicies.destructiveMutation);
    const projectId = entityIdSchema.parse(stringValue(formData, "projectId"));
    const { taskCount } = await deleteOwnedProject(mutationRepository, user.id, projectId);
    revalidateProjectViews();
    revalidateTaskViews();
    return {
      status: "success",
      message: `Project deleted${taskCount ? ` with ${taskCount} associated task${taskCount === 1 ? "" : "s"}` : ""}.`,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateTaskAction(
  _previousState: MutationActionState,
  formData: FormData,
): Promise<MutationActionState> {
  try {
    const user = await requireUser();
    const taskId = entityIdSchema.parse(stringValue(formData, "taskId"));
    const input = taskInputSchema.safeParse(taskValues(formData));
    if (!input.success) return { status: "error", message: validationMessage(input.error) };
    await updateOwnedTask(mutationRepository, user.id, taskId, input.data);
    const originalProjectId = entityIdSchema.safeParse(stringValue(formData, "originalProjectId"));
    if (originalProjectId.success && originalProjectId.data !== input.data.projectId) {
      revalidatePath(`/dashboard/projects/${originalProjectId.data}`);
    }
    revalidateTaskViews(input.data.projectId);
    return { status: "success", message: "Task updated successfully." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTaskAction(
  _previousState: MutationActionState,
  formData: FormData,
): Promise<MutationActionState> {
  try {
    const user = await requireUser();
    await enforceRateLimit("delete-task", user.id, rateLimitPolicies.destructiveMutation);
    const taskId = entityIdSchema.parse(stringValue(formData, "taskId"));
    await deleteOwnedTask(mutationRepository, user.id, taskId);
    revalidateTaskViews(stringValue(formData, "projectId") || undefined);
    return { status: "success", message: "Task deleted successfully." };
  } catch (error) {
    return errorState(error);
  }
}

export async function persistKanbanAction(input: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await requireUser();
    const parsed = kanbanOrderSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: validationMessage(parsed.error) };
    await persistOwnedKanbanOrder(mutationRepository, user.id, parsed.data);
    revalidateTaskViews();
    return { ok: true, message: "Board order saved." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The board could not be saved." };
  }
}
