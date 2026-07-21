"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui";

const presets = [
  [15, "15 minutes before"],
  [60, "1 hour before"],
  [1440, "1 day before"],
  [2880, "2 days before"],
  [10080, "1 week before"],
] as const;

function toLocalDateTime(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function TaskScheduleFields({
  deadlineAt,
  dueDate,
  reminderMinutes,
  reminderAt,
}: {
  deadlineAt?: Date | string | null;
  dueDate?: string | null;
  reminderMinutes?: number | null;
  reminderAt?: Date | string | null;
}) {
  const initialDeadline = toLocalDateTime(deadlineAt) || (dueDate ? `${dueDate}T17:00` : "");
  const initialChoice = reminderAt ? (reminderMinutes ? String(reminderMinutes) : "custom") : "none";
  const [deadline, setDeadline] = useState(initialDeadline);
  const [choice, setChoice] = useState(initialChoice);
  const [customReminder, setCustomReminder] = useState(toLocalDateTime(reminderAt));

  const reminderIso = useMemo(() => {
    if (!deadline || choice === "none") return "";
    if (choice === "custom") return toIso(customReminder);
    const minutes = Number(choice);
    const time = new Date(deadline).getTime() - minutes * 60_000;
    return Number.isNaN(time) ? "" : new Date(time).toISOString();
  }, [choice, customReminder, deadline]);

  return <>
    <input type="hidden" name="dueDate" value={deadline.slice(0, 10)} />
    <input type="hidden" name="deadlineAt" value={toIso(deadline)} />
    <input type="hidden" name="reminderMinutes" value={choice === "none" || choice === "custom" ? "" : choice} />
    <input type="hidden" name="reminderAt" value={reminderIso} />
    <label className="text-sm font-medium text-slate-700">Deadline
      <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={`${inputClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-slate-700">Email reminder
      <select value={choice} onChange={(event) => setChoice(event.target.value)} disabled={!deadline} className={`${inputClass} mt-1.5 disabled:bg-slate-100`}>
        <option value="none">No reminder</option>
        {presets.map(([minutes, label]) => <option key={minutes} value={minutes}>{label}</option>)}
        <option value="custom">Custom time</option>
      </select>
    </label>
    {choice === "custom" && deadline && <label className="text-sm font-medium text-slate-700 sm:col-span-2">Send reminder at
      <input type="datetime-local" required value={customReminder} onChange={(event) => setCustomReminder(event.target.value)} className={`${inputClass} mt-1.5`} />
    </label>}
    {choice !== "none" && <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Reminder email is sent once. Changing the reminder time creates a new schedule.</p>}
  </>;
}
