"use client";

import { Pencil, Trash2 } from "lucide-react";
import { deleteProjectAction, updateProjectAction } from "@/app/actions";
import { MutationDialog } from "@/components/mutation-dialog";
import { inputClass } from "@/components/ui";

export type EditableProject = {
  id: string;
  title: string;
  description: string;
  area: string;
  status: "idea" | "planned" | "active" | "waiting" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "critical";
  nextAction: string;
  targetDate: string | null;
};

const triggerClass = "inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

export function EditProjectDialog({ project }: { project: EditableProject }) {
  return (
    <MutationDialog
      trigger={<button type="button" className={triggerClass}><Pencil size={15} /> Edit</button>}
      title={`Edit ${project.title}`}
      description="Update the project details. Changes are validated and applied only to projects you own."
      action={updateProjectAction}
    >
      <input type="hidden" name="projectId" value={project.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Title<input autoFocus name="title" required minLength={2} defaultValue={project.title} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-medium text-slate-700">Area<input name="area" required defaultValue={project.area} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={project.status} className={`${inputClass} mt-1.5`}><option value="idea">Idea</option><option value="planned">Planned</option><option value="active">Active</option><option value="waiting">Waiting</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-medium text-slate-700">Priority<select name="priority" defaultValue={project.priority} className={`${inputClass} mt-1.5`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label className="text-sm font-medium text-slate-700">Deadline<input name="targetDate" type="date" defaultValue={project.targetDate ?? ""} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" rows={4} defaultValue={project.description} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Next action<input name="nextAction" defaultValue={project.nextAction} className={`${inputClass} mt-1.5`} /></label>
      </div>
    </MutationDialog>
  );
}

export function DeleteProjectDialog({ project, taskCount, redirectTo }: { project: Pick<EditableProject, "id" | "title">; taskCount?: number; redirectTo?: string }) {
  const taskWarning = taskCount === undefined
    ? "All tasks and comments associated with this project will also be permanently deleted."
    : `${taskCount} associated task${taskCount === 1 ? "" : "s"} and their comments will also be permanently deleted.`;
  return (
    <MutationDialog
      trigger={<button type="button" className={`${triggerClass} text-red-700 hover:bg-red-50`}><Trash2 size={15} /> Delete</button>}
      title={`Delete ${project.title}?`}
      description="This action cannot be undone."
      action={deleteProjectAction}
      submitLabel="Delete project"
      destructive
      redirectTo={redirectTo}
    >
      <input type="hidden" name="projectId" value={project.id} />
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
        <p className="font-bold">You are deleting “{project.title}”.</p>
        <p className="mt-1">{taskWarning}</p>
      </div>
    </MutationDialog>
  );
}

