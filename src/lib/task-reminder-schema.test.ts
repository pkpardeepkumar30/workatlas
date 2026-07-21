import { describe, expect, it } from "vitest";
import { taskInputSchema } from "@/lib/mutation-schemas";

const base = {
  projectId: "00000000-0000-4000-8000-000000000001",
  title: "Kanban-created task",
  description: "",
  status: "blocked",
  priority: "medium",
  dueDate: "2026-08-01",
  deadlineAt: "2026-08-01T12:00:00.000Z",
};

describe("task deadline reminders", () => {
  it.each([15, 60, 1440, 2880, 10080])("accepts the %i-minute preset", (minutes) => {
    const reminderAt = new Date(new Date(base.deadlineAt).getTime() - minutes * 60_000).toISOString();
    expect(taskInputSchema.safeParse({ ...base, reminderMinutes: String(minutes), reminderAt }).success).toBe(true);
  });

  it("accepts a custom time and preserves the selected Kanban column", () => {
    const result = taskInputSchema.parse({ ...base, reminderMinutes: "", reminderAt: "2026-07-31T18:30:00.000Z" });
    expect(result).toMatchObject({ status: "blocked", reminderMinutes: null });
  });

  it("rejects reminders without a deadline or at/after the deadline", () => {
    expect(taskInputSchema.safeParse({ ...base, deadlineAt: "", reminderMinutes: "60", reminderAt: "2026-08-01T11:00:00.000Z" }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...base, reminderMinutes: "", reminderAt: base.deadlineAt }).success).toBe(false);
  });
});
