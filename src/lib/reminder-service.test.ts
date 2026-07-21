import { describe, expect, it, vi } from "vitest";
import { processTaskReminders, type DueTaskReminder, type ReminderRepository } from "@/lib/reminder-service";

const reminder: DueTaskReminder = {
  taskId: "10000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000002",
  email: "owner@example.com",
  name: "Owner",
  taskTitle: "Ship release",
  projectTitle: "WorkAtlas",
  deadlineAt: new Date("2026-07-21T12:00:00Z"),
  reminderAt: new Date("2026-07-21T11:00:00Z"),
};

function repository(overrides: Partial<ReminderRepository> = {}): ReminderRepository {
  return {
    listDue: vi.fn().mockResolvedValue([reminder]),
    claim: vi.fn().mockResolvedValue("notification-1"),
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("task reminder processing", () => {
  it("claims before sending and records successful delivery", async () => {
    const repo = repository();
    const send = vi.fn().mockResolvedValue(true);
    const result = await processTaskReminders(repo, send, new Date("2026-07-21T11:00:00Z"));
    expect(result).toEqual({ due: 1, sent: 1, skipped: 0, failed: 0 });
    expect(repo.claim).toHaveBeenCalledWith(reminder);
    expect(send).toHaveBeenCalledOnce();
    expect(repo.markSent).toHaveBeenCalledOnce();
  });

  it("does not send a reminder that another worker already claimed", async () => {
    const repo = repository({ claim: vi.fn().mockResolvedValue(null) });
    const send = vi.fn().mockResolvedValue(true);
    const result = await processTaskReminders(repo, send);
    expect(result.skipped).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("records a non-sensitive failure code without retrying in the same run", async () => {
    const repo = repository();
    const send = vi.fn().mockRejectedValue(new Error("provider secret and user data"));
    const result = await processTaskReminders(repo, send);
    expect(result.failed).toBe(1);
    expect(repo.markFailed).toHaveBeenCalledWith("notification-1", "delivery_failed");
  });
});
