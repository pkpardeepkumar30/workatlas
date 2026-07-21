"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTaskAction } from "@/app/actions";
import { menuItemClass } from "@/components/action-menu";
import { MutationDialog } from "@/components/mutation-dialog";
import { PrioritySelect } from "@/components/priority";
import { SuccessCheck } from "@/components/success-check";
import { TaskScheduleFields } from "@/components/task-schedule-fields";
import { Button, inputClass } from "@/components/ui";
import { initialMutationState } from "@/lib/action-state";
import type { TaskStatus } from "@/lib/mutation-schemas";

export type ProjectOption = { id: string; title: string };

function TaskFields({
  projectId,
  projectTitle,
  projects,
  defaultStatus = "todo",
}: {
  projectId?: string;
  projectTitle?: string;
  projects?: ProjectOption[];
  defaultStatus?: TaskStatus;
}) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {projectId ? <>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">Project</span><p className="font-semibold text-slate-800">{projectTitle ?? "Current project"}</p></div>
    </> : <label className="sm:col-span-2 text-sm font-medium text-slate-700">Project<select name="projectId" required className={`${inputClass} mt-1.5`}><option value="">Select a project</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
    <label className="sm:col-span-2 text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} className={`${inputClass} mt-1.5`} placeholder="Define the next concrete outcome" /></label>
    <label className="sm:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" rows={4} className={`${inputClass} mt-1.5`} placeholder="Context, acceptance criteria, or useful notes" /></label>
    <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue={defaultStatus} className={`${inputClass} mt-1.5`}><option value="backlog">Backlog</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
    <label className="text-sm font-medium text-slate-700">Priority<PrioritySelect name="priority" defaultValue="medium" className="mt-1.5" /></label>
    <TaskScheduleFields />
  </div>;
}

export function CreateTaskDialog({
  projectId,
  projectTitle,
  projects,
  label = "Add task",
  defaultStatus = "todo",
  triggerVariant = "button",
}: {
  projectId?: string;
  projectTitle?: string;
  projects?: ProjectOption[];
  label?: string;
  defaultStatus?: TaskStatus;
  triggerVariant?: "button" | "menu";
}) {
  const trigger = triggerVariant === "menu"
    ? <button type="button" role="menuitem" className={menuItemClass}><Plus size={16} />{label}</button>
    : <Button type="button"><Plus size={16} />{label}</Button>;
  return <MutationDialog
    trigger={trigger}
    title="Add task"
    description={projectId ? `Create a task in ${projectTitle ?? "this project"}.` : `Create a task in the ${defaultStatus.replace("_", " ")} column and choose its project.`}
    action={createTaskAction}
    submitLabel="Create task"
  ><TaskFields projectId={projectId} projectTitle={projectTitle} projects={projects} defaultStatus={defaultStatus} /></MutationDialog>;
}

function SubmitTaskButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Creating…" : "Add task"}</Button>;
}

export function TaskForm({ projectId, projectTitle, projects }: { projectId?: string; projectTitle?: string; projects?: ProjectOption[] }) {
  const [state, action] = useActionState(createTaskAction, initialMutationState);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
      const timeout = window.setTimeout(() => {
        setFormVersion((current) => current + 1);
        setShowSuccess(true);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [router, state]);
  return <form key={formVersion} ref={formRef} action={action} className="space-y-5">
    <TaskFields projectId={projectId} projectTitle={projectTitle} projects={projects} />
    {state.status === "error" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
    <div className="flex items-center gap-3"><SubmitTaskButton /><SuccessCheck show={showSuccess} label="Task created" onDismiss={() => setShowSuccess(false)} /></div>
  </form>;
}
