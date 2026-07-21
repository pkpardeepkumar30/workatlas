import { and, asc, eq, gt, isNotNull, lte, ne, or } from "drizzle-orm";
import { projects, taskReminderNotifications, tasks, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { DueTaskReminder, ReminderRepository } from "@/lib/reminder-service";

export const reminderRepository: ReminderRepository = {
  async listDue(now, limit) {
    const rows = await db
      .select({
        taskId: tasks.id,
        userId: tasks.ownerId,
        email: users.email,
        name: users.name,
        taskTitle: tasks.title,
        projectTitle: projects.title,
        deadlineAt: tasks.deadlineAt,
        reminderAt: tasks.reminderAt,
      })
      .from(tasks)
      .innerJoin(users, eq(users.id, tasks.ownerId))
      .innerJoin(projects, and(eq(projects.id, tasks.projectId), eq(projects.ownerId, tasks.ownerId)))
      .where(and(
        or(isNotNull(users.emailVerifiedAt), eq(users.emailVerificationRequired, false)),
        isNotNull(tasks.deadlineAt),
        isNotNull(tasks.reminderAt),
        lte(tasks.reminderAt, now),
        gt(tasks.deadlineAt, now),
        ne(tasks.status, "done"),
      ))
      .orderBy(asc(tasks.reminderAt), asc(tasks.id))
      .limit(limit);

    return rows as DueTaskReminder[];
  },

  async claim(reminder) {
    const [notification] = await db
      .insert(taskReminderNotifications)
      .values({
        taskId: reminder.taskId,
        userId: reminder.userId,
        reminderAt: reminder.reminderAt,
      })
      .onConflictDoNothing({
        target: [taskReminderNotifications.taskId, taskReminderNotifications.reminderAt],
      })
      .returning({ id: taskReminderNotifications.id });
    return notification?.id ?? null;
  },

  async markSent(notificationId, sentAt) {
    await db.update(taskReminderNotifications)
      .set({ status: "sent", sentAt, failureCode: null })
      .where(and(eq(taskReminderNotifications.id, notificationId), eq(taskReminderNotifications.status, "claimed")));
  },

  async markFailed(notificationId, failureCode) {
    await db.update(taskReminderNotifications)
      .set({ status: "failed", failureCode })
      .where(and(eq(taskReminderNotifications.id, notificationId), eq(taskReminderNotifications.status, "claimed")));
  },
};
