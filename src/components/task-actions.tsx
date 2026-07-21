"use client";

import { Pencil, Trash2 } from "lucide-react";
import { deleteTaskAction, updateTaskAction } from "@/app/actions";
import { ActionMenu, menuItemClass } from "@/components/action-menu";
import { MutationDialog } from "@/components/mutation-dialog";
import { PrioritySelect } from "@/components/priority";
import { TaskScheduleFields } from "@/components/task-schedule-fields";
import { inputClass } from "@/components/ui";

export type EditableTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string | null;
  deadlineAt: Date | string | null;
  reminderMinutes: number | null;
  reminderAt: Date | string | null;
};

export type ProjectOption = { id: string; title: string };
const triggerClass = "inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

export function EditTaskDialog({ task, projects, triggerVariant = "button" }: { task: EditableTask; projects: ProjectOption[]; triggerVariant?: "button" | "menu" }) {
  const trigger = <button type="button" role={triggerVariant === "menu" ? "menuitem" : undefined} className={triggerVariant === "menu" ? menuItemClass : triggerClass}><Pencil size={15} /> Edit</button>;
  return (
    <MutationDialog
      trigger={trigger}
      title={`Edit ${task.title}`}
      description="Update task details, its deadline reminder, or associated project."
      action={updateTaskAction}
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="originalProjectId" value={task.projectId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Title<input autoFocus name="title" required minLength={2} defaultValue={task.title} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Project<select name="projectId" required defaultValue={task.projectId} className={`${inputClass} mt-1.5`}>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={task.status} className={`${inputClass} mt-1.5`}><option value="backlog">Backlog</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
        <label className="text-sm font-medium text-slate-700">Priority<PrioritySelect name="priority" defaultValue={task.priority} className="mt-1.5" /></label>
        <TaskScheduleFields deadlineAt={task.deadlineAt} dueDate={task.dueDate} reminderMinutes={task.reminderMinutes} reminderAt={task.reminderAt} />
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" rows={4} defaultValue={task.description} className={`${inputClass} mt-1.5`} /></label>
      </div>
    </MutationDialog>
  );
}

export function DeleteTaskDialog({ task, triggerVariant = "button" }: { task: Pick<EditableTask, "id" | "projectId" | "title">; triggerVariant?: "button" | "menu" }) {
  const trigger = <button type="button" role={triggerVariant === "menu" ? "menuitem" : undefined} className={triggerVariant === "menu" ? `${menuItemClass} text-red-700 hover:bg-red-50` : `${triggerClass} text-red-700 hover:bg-red-50`}><Trash2 size={15} /> Delete</button>;
  return (
    <MutationDialog
      trigger={trigger}
      title={`Delete ${task.title}?`}
      description="This action cannot be undone."
      action={deleteTaskAction}
      submitLabel="Delete task"
      destructive
    >
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="projectId" value={task.projectId} />
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
        The task “{task.title}” and any comments attached to it will be permanently deleted.
      </div>
    </MutationDialog>
  );
}

export function TaskActionMenu({ task, projects }: { task: EditableTask; projects: ProjectOption[] }) {
  return <ActionMenu label={`${task.title} actions`}>
    <EditTaskDialog task={task} projects={projects} triggerVariant="menu" />
    <DeleteTaskDialog task={task} triggerVariant="menu" />
  </ActionMenu>;
}
