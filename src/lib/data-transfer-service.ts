import { dataTransferDocumentSchema, formatTransferValidationError, getTransferCounts, type ConflictStrategy, type DataTransferDocument } from "@/lib/data-transfer-schema";

export type ExportIdentity = { id: string; name: string; email: string };
export type OwnedTransferRows = {
  projects: Array<{
    id: string; title: string; description: string; area: string; status: "idea" | "planned" | "active" | "waiting" | "completed" | "archived";
    priority: "low" | "medium" | "high" | "critical"; nextAction: string; repositoryUrl: string | null; isPublic: boolean;
    targetDate: string | null; tags: string[]; createdAt: Date; updatedAt: Date;
  }>;
  tasks: Array<{
    id: string; projectId: string; title: string; description: string; status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
    priority: "low" | "medium" | "high" | "critical"; dueDate: string | null; position: number; tags: string[]; createdAt: Date; updatedAt: Date;
  }>;
  comments: Array<{ id: string; projectId: string; taskId: string | null; body: string; createdAt: Date; updatedAt: Date }>;
};

export type ImportResult = {
  projects: { created: number; updated: number; skipped: number };
  tasks: { created: number; updated: number; skipped: number };
  comments: { created: number; updated: number; skipped: number };
};

export type AuditActivity = {
  action: "export" | "import";
  format: "json" | "yaml" | "xlsx";
  status: "success" | "failed";
  projectCount: number;
  taskCount: number;
  commentCount: number;
  details?: Record<string, string | number | boolean | null>;
};

export interface DataTransferRepository {
  loadOwnedData(ownerId: string): Promise<OwnedTransferRows>;
  importDocument(ownerId: string, document: DataTransferDocument, strategy: ConflictStrategy, format: AuditActivity["format"]): Promise<ImportResult>;
  recordAudit(ownerId: string, activity: AuditActivity): Promise<void>;
}

export async function buildExportDocument(identity: ExportIdentity, repository: DataTransferRepository, now = new Date()): Promise<DataTransferDocument> {
  const rows = await repository.loadOwnedData(identity.id);
  const tasksByProject = new Map<string, OwnedTransferRows["tasks"]>();
  const commentsByProject = new Map<string, OwnedTransferRows["comments"]>();
  for (const task of rows.tasks) tasksByProject.set(task.projectId, [...(tasksByProject.get(task.projectId) ?? []), task]);
  for (const comment of rows.comments) commentsByProject.set(comment.projectId, [...(commentsByProject.get(comment.projectId) ?? []), comment]);

  const document: DataTransferDocument = {
    metadata: {
      exportVersion: "1.0",
      exportedAt: now.toISOString(),
      application: "WorkAtlas",
      account: { name: identity.name, email: identity.email },
    },
    projects: rows.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      area: project.area,
      status: project.status,
      priority: project.priority,
      nextAction: project.nextAction,
      repositoryUrl: project.repositoryUrl,
      isPublic: project.isPublic,
      targetDate: project.targetDate,
      tags: project.tags,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      tasks: (tasksByProject.get(project.id) ?? []).sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime()).map((task) => ({
        id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority,
        dueDate: task.dueDate, position: task.position, tags: task.tags, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
      })),
      comments: (commentsByProject.get(project.id) ?? []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((comment) => ({
        id: comment.id, taskId: comment.taskId, body: comment.body, createdAt: comment.createdAt.toISOString(), updatedAt: comment.updatedAt.toISOString(),
      })),
    })),
  };
  return dataTransferDocumentSchema.parse(document);
}

export function validateTransferDocument(input: unknown) {
  const result = dataTransferDocumentSchema.safeParse(input);
  if (!result.success) return { success: false as const, errors: formatTransferValidationError(result.error) };
  return { success: true as const, document: result.data, counts: getTransferCounts(result.data) };
}

export async function importTransferDocument(
  ownerId: string,
  input: unknown,
  strategy: ConflictStrategy,
  format: AuditActivity["format"],
  repository: DataTransferRepository,
) {
  const validated = validateTransferDocument(input);
  if (!validated.success) return validated;
  const result = await repository.importDocument(ownerId, validated.document, strategy, format);
  return { success: true as const, counts: validated.counts, result };
}
