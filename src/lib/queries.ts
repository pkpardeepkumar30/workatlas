import { and, asc, desc, eq, ne } from "drizzle-orm";
import { projects, tasks } from "@/db/schema";
import { db } from "@/lib/db";

export function getProjects(ownerId: string) {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), ne(projects.status, "archived")))
    .orderBy(desc(projects.updatedAt));
}

export function getIdeas(ownerId: string) {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), eq(projects.status, "idea")))
    .orderBy(desc(projects.createdAt));
}

export function getTasks(ownerId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectTitle: projects.title,
      position: tasks.position,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.ownerId, ownerId))
    .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt));
}

export function getKanbanTasks(ownerId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectTitle: projects.title,
      position: tasks.position,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.ownerId, ownerId))
    .orderBy(asc(tasks.status), asc(tasks.position), asc(tasks.createdAt));
}

export function getProjectOptions(ownerId: string) {
  return db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(asc(projects.title));
}

export async function getProject(ownerId: string, projectId: string) {
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return result[0] ?? null;
}

export function getProjectTasks(ownerId: string, projectId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.ownerId, ownerId), eq(tasks.projectId, projectId)))
    .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt));
}
