import { NextResponse } from "next/server";
import { validBearerToken } from "@/lib/cron-auth";
import { reminderRepository } from "@/lib/drizzle-reminder-repository";
import { sendTaskReminderEmail } from "@/lib/email";
import { getReminderEnvironment } from "@/lib/env";
import { processTaskReminders } from "@/lib/reminder-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { cronSecret } = getReminderEnvironment();
  if (!validBearerToken(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await processTaskReminders(
    reminderRepository,
    (reminder) => sendTaskReminderEmail({
      email: reminder.email,
      name: reminder.name,
      taskTitle: reminder.taskTitle,
      projectTitle: reminder.projectTitle,
      deadlineAt: reminder.deadlineAt,
    }),
  );
  return NextResponse.json(result);
}
