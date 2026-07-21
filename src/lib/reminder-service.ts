export type DueTaskReminder = {
  taskId: string;
  userId: string;
  email: string;
  name: string;
  taskTitle: string;
  projectTitle: string;
  deadlineAt: Date;
  reminderAt: Date;
};

export interface ReminderRepository {
  listDue(now: Date, limit: number): Promise<DueTaskReminder[]>;
  claim(reminder: DueTaskReminder): Promise<string | null>;
  markSent(notificationId: string, sentAt: Date): Promise<void>;
  markFailed(notificationId: string, failureCode: "delivery_failed" | "provider_unavailable"): Promise<void>;
}

export type ReminderSender = (reminder: DueTaskReminder) => Promise<boolean>;

export type ReminderRunResult = {
  due: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function processTaskReminders(
  repository: ReminderRepository,
  send: ReminderSender,
  now = new Date(),
  limit = 100,
): Promise<ReminderRunResult> {
  const due = await repository.listDue(now, limit);
  const result: ReminderRunResult = { due: due.length, sent: 0, skipped: 0, failed: 0 };

  for (const reminder of due) {
    const notificationId = await repository.claim(reminder);
    if (!notificationId) {
      result.skipped += 1;
      continue;
    }

    try {
      const sent = await send(reminder);
      if (!sent) {
        await repository.markFailed(notificationId, "provider_unavailable");
        result.failed += 1;
        continue;
      }
      await repository.markSent(notificationId, now);
      result.sent += 1;
    } catch {
      await repository.markFailed(notificationId, "delivery_failed");
      result.failed += 1;
    }
  }

  return result;
}
