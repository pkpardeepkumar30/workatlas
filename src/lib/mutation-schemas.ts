import { z } from "zod";
import { priorities } from "@/lib/priority-config";

export const projectStatuses = ["idea", "planned", "active", "waiting", "completed", "archived"] as const;
export const taskStatuses = ["backlog", "todo", "in_progress", "blocked", "done"] as const;
export { priorities };

const optionalDate = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().date().nullable());

export const projectInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  area: z.string().trim().min(2).max(80).default("General"),
  status: z.enum(projectStatuses),
  priority: z.enum(priorities),
  nextAction: z.string().trim().max(300).default(""),
  targetDate: optionalDate,
});

export const taskInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(taskStatuses),
  priority: z.enum(priorities),
  dueDate: optionalDate,
});

export const entityIdSchema = z.string().uuid();

export const kanbanOrderSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(taskStatuses),
      position: z.number().int().min(0),
    }).strict(),
  )
  .max(1000)
  .superRefine((items, context) => {
    const ids = new Set<string>();
    const positions = new Set<string>();
    items.forEach((item, index) => {
      if (ids.has(item.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "task appears more than once" });
      const positionKey = `${item.status}:${item.position}`;
      if (positions.has(positionKey)) context.addIssue({ code: "custom", path: [index, "position"], message: "position must be unique within its column" });
      ids.add(item.id);
      positions.add(positionKey);
    });
    for (const status of taskStatuses) {
      const columnPositions = items.filter((item) => item.status === status).map((item) => item.position).sort((a, b) => a - b);
      columnPositions.forEach((position, index) => {
        if (position !== index) context.addIssue({ code: "custom", path: ["position"], message: `${status} positions must be contiguous from zero` });
      });
    }
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type KanbanOrderItem = z.infer<typeof kanbanOrderSchema>[number];
