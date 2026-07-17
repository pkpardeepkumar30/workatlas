import { z } from "zod";

export const DATA_EXPORT_VERSION = "1.0" as const;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_PROJECTS = 1_000;
export const MAX_IMPORT_TASKS = 10_000;
export const MAX_IMPORT_COMMENTS = 20_000;

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must use YYYY-MM-DD").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "must be a real calendar date").nullable();
const timestampSchema = z.string().datetime({ offset: true });
const tagsSchema = z.array(z.string().trim().min(1).max(80)).max(50).default([]);

export const transferCommentSchema = z.object({
  id: idSchema,
  taskId: idSchema.nullable(),
  body: z.string().min(1).max(50_000),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

export const transferTaskSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(300),
  description: z.string().max(100_000),
  status: z.enum(["backlog", "todo", "in_progress", "blocked", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: dateSchema,
  position: z.number().int().min(0).max(1_000_000),
  tags: tagsSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();

export const transferProjectSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(300),
  description: z.string().max(100_000),
  area: z.string().min(1).max(200),
  status: z.enum(["idea", "planned", "active", "waiting", "completed", "archived"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  nextAction: z.string().max(10_000),
  repositoryUrl: z.string().url().max(2_000).refine((value) => /^https?:\/\//i.test(value), "must use HTTP or HTTPS").nullable(),
  isPublic: z.boolean(),
  targetDate: dateSchema,
  tags: tagsSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  tasks: z.array(transferTaskSchema),
  comments: z.array(transferCommentSchema),
}).strict();

export const dataTransferDocumentSchema = z.object({
  metadata: z.object({
    exportVersion: z.literal(DATA_EXPORT_VERSION),
    exportedAt: timestampSchema,
    application: z.literal("WorkAtlas"),
    account: z.object({ name: z.string().min(1).max(200), email: z.string().email().max(320) }).strict(),
  }).strict(),
  projects: z.array(transferProjectSchema).max(MAX_IMPORT_PROJECTS),
}).strict().superRefine((document, context) => {
  const projectIds = new Set<string>();
  const taskIds = new Set<string>();
  const commentIds = new Set<string>();
  let taskCount = 0;
  let commentCount = 0;

  document.projects.forEach((project, projectIndex) => {
    if (projectIds.has(project.id)) context.addIssue({ code: "custom", path: ["projects", projectIndex, "id"], message: "duplicate project ID" });
    projectIds.add(project.id);
    const projectTaskIds = new Set<string>();
    project.tasks.forEach((task, taskIndex) => {
      taskCount += 1;
      if (taskIds.has(task.id)) context.addIssue({ code: "custom", path: ["projects", projectIndex, "tasks", taskIndex, "id"], message: "duplicate task ID" });
      taskIds.add(task.id);
      projectTaskIds.add(task.id);
    });
    project.comments.forEach((comment, commentIndex) => {
      commentCount += 1;
      if (commentIds.has(comment.id)) context.addIssue({ code: "custom", path: ["projects", projectIndex, "comments", commentIndex, "id"], message: "duplicate comment ID" });
      commentIds.add(comment.id);
      if (comment.taskId && !projectTaskIds.has(comment.taskId)) {
        context.addIssue({ code: "custom", path: ["projects", projectIndex, "comments", commentIndex, "taskId"], message: "must reference a task in the same project" });
      }
    });
  });

  if (taskCount > MAX_IMPORT_TASKS) context.addIssue({ code: "custom", path: ["projects"], message: `contains more than ${MAX_IMPORT_TASKS} tasks` });
  if (commentCount > MAX_IMPORT_COMMENTS) context.addIssue({ code: "custom", path: ["projects"], message: `contains more than ${MAX_IMPORT_COMMENTS} comments` });
});

export const conflictStrategySchema = z.enum(["create_new", "skip_existing", "update_matching"]);
export type ConflictStrategy = z.infer<typeof conflictStrategySchema>;
export type DataTransferDocument = z.infer<typeof dataTransferDocumentSchema>;
export type TransferProject = z.infer<typeof transferProjectSchema>;
export type TransferTask = z.infer<typeof transferTaskSchema>;
export type TransferComment = z.infer<typeof transferCommentSchema>;

export function getTransferCounts(document: DataTransferDocument) {
  return document.projects.reduce((counts, project) => ({
    projects: counts.projects + 1,
    tasks: counts.tasks + project.tasks.length,
    comments: counts.comments + project.comments.length,
  }), { projects: 0, tasks: 0, comments: 0 });
}

export function formatTransferValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "file",
    message: issue.message,
  }));
}
