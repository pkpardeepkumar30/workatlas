import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { comments, dataTransferAuditLogs, projects, tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { getTransferCounts } from "@/lib/data-transfer-schema";
import type { AuditActivity, DataTransferRepository, ImportResult } from "@/lib/data-transfer-service";

function emptyImportResult(): ImportResult {
  return {
    projects: { created: 0, updated: 0, skipped: 0 },
    tasks: { created: 0, updated: 0, skipped: 0 },
    comments: { created: 0, updated: 0, skipped: 0 },
  };
}

export const dataTransferRepository: DataTransferRepository = {
  async loadOwnedData(ownerId) {
    const [ownedProjects, ownedTasks, ownedComments] = await Promise.all([
      db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(asc(projects.createdAt)),
      db.select().from(tasks).where(eq(tasks.ownerId, ownerId)).orderBy(asc(tasks.projectId), asc(tasks.position), asc(tasks.createdAt)),
      db.select({
        id: comments.id, projectId: comments.projectId, taskId: comments.taskId, body: comments.body,
        createdAt: comments.createdAt, updatedAt: comments.updatedAt,
      }).from(comments)
        .innerJoin(projects, eq(comments.projectId, projects.id))
        .where(and(eq(projects.ownerId, ownerId), eq(comments.authorId, ownerId)))
        .orderBy(asc(comments.createdAt)),
    ]);
    return { projects: ownedProjects, tasks: ownedTasks, comments: ownedComments };
  },

  async recordAudit(ownerId, activity) {
    await db.insert(dataTransferAuditLogs).values({
      userId: ownerId,
      action: activity.action,
      format: activity.format,
      status: activity.status,
      projectCount: activity.projectCount,
      taskCount: activity.taskCount,
      commentCount: activity.commentCount,
      details: activity.details ?? {},
    });
  },

  async importDocument(ownerId, document, strategy, format) {
    return db.transaction(async (transaction) => {
      const result = emptyImportResult();

      for (const incomingProject of document.projects) {
        const [ownedProject] = await transaction.select({ id: projects.id }).from(projects)
          .where(and(eq(projects.id, incomingProject.id), eq(projects.ownerId, ownerId))).limit(1);

        if (strategy === "skip_existing" && ownedProject) {
          result.projects.skipped += 1;
          result.tasks.skipped += incomingProject.tasks.length;
          result.comments.skipped += incomingProject.comments.length;
          continue;
        }

        const projectId = strategy === "create_new" ? randomUUID() : incomingProject.id;
        const projectValues = {
          ownerId,
          title: incomingProject.title,
          description: incomingProject.description,
          area: incomingProject.area,
          status: incomingProject.status,
          priority: incomingProject.priority,
          nextAction: incomingProject.nextAction,
          repositoryUrl: incomingProject.repositoryUrl,
          isPublic: incomingProject.isPublic,
          targetDate: incomingProject.targetDate,
          tags: incomingProject.tags,
          createdAt: new Date(incomingProject.createdAt),
          updatedAt: new Date(incomingProject.updatedAt),
        };

        if (strategy === "update_matching" && ownedProject) {
          await transaction.update(projects).set(projectValues).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
          result.projects.updated += 1;
        } else {
          await transaction.insert(projects).values({ id: projectId, ...projectValues });
          result.projects.created += 1;
        }

        const taskIdMap = new Map<string, string>();
        for (const incomingTask of incomingProject.tasks) {
          const [ownedTask] = await transaction.select({ id: tasks.id, projectId: tasks.projectId }).from(tasks)
            .where(and(eq(tasks.id, incomingTask.id), eq(tasks.ownerId, ownerId))).limit(1);
          if (strategy === "skip_existing" && ownedTask) {
            result.tasks.skipped += 1;
            if (ownedTask.projectId === projectId) taskIdMap.set(incomingTask.id, ownedTask.id);
            continue;
          }

          const taskId = strategy === "create_new" ? randomUUID() : incomingTask.id;
          const taskValues = {
            ownerId,
            projectId,
            title: incomingTask.title,
            description: incomingTask.description,
            status: incomingTask.status,
            priority: incomingTask.priority,
            dueDate: incomingTask.dueDate,
            deadlineAt: incomingTask.deadlineAt ? new Date(incomingTask.deadlineAt) : null,
            reminderMinutes: incomingTask.reminderMinutes,
            reminderAt: incomingTask.reminderAt ? new Date(incomingTask.reminderAt) : null,
            position: incomingTask.position,
            tags: incomingTask.tags,
            createdAt: new Date(incomingTask.createdAt),
            updatedAt: new Date(incomingTask.updatedAt),
          };
          if (strategy === "update_matching" && ownedTask) {
            await transaction.update(tasks).set(taskValues).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
            result.tasks.updated += 1;
          } else {
            await transaction.insert(tasks).values({ id: taskId, ...taskValues });
            result.tasks.created += 1;
          }
          taskIdMap.set(incomingTask.id, taskId);
        }

        for (const incomingComment of incomingProject.comments) {
          const mappedTaskId = incomingComment.taskId ? taskIdMap.get(incomingComment.taskId) : null;
          if (incomingComment.taskId && !mappedTaskId) {
            result.comments.skipped += 1;
            continue;
          }
          const [ownedComment] = await transaction.select({ id: comments.id }).from(comments)
            .where(and(eq(comments.id, incomingComment.id), eq(comments.authorId, ownerId))).limit(1);
          if (strategy === "skip_existing" && ownedComment) {
            result.comments.skipped += 1;
            continue;
          }

          const commentId = strategy === "create_new" ? randomUUID() : incomingComment.id;
          const commentValues = {
            projectId,
            taskId: mappedTaskId,
            authorId: ownerId,
            body: incomingComment.body,
            createdAt: new Date(incomingComment.createdAt),
            updatedAt: new Date(incomingComment.updatedAt),
          };
          if (strategy === "update_matching" && ownedComment) {
            await transaction.update(comments).set(commentValues).where(and(eq(comments.id, commentId), eq(comments.authorId, ownerId)));
            result.comments.updated += 1;
          } else {
            await transaction.insert(comments).values({ id: commentId, ...commentValues });
            result.comments.created += 1;
          }
        }
      }

      const counts = getTransferCounts(document);
      await transaction.insert(dataTransferAuditLogs).values({
        userId: ownerId,
        action: "import",
        format,
        status: "success",
        projectCount: counts.projects,
        taskCount: counts.tasks,
        commentCount: counts.comments,
        details: { strategy },
      });
      return result;
    });
  },
};

export async function recordFailedImport(ownerId: string, format: AuditActivity["format"], reason: string) {
  await dataTransferRepository.recordAudit(ownerId, {
    action: "import", format, status: "failed", projectCount: 0, taskCount: 0, commentCount: 0,
    details: { reason: reason.slice(0, 200) },
  });
}
