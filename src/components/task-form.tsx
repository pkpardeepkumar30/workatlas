"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createTaskAction } from "@/app/actions";
import { MutationDialog } from "@/components/mutation-dialog";
import { PrioritySelect } from "@/components/priority";
import { Button, inputClass } from "@/components/ui";
import { initialMutationState } from "@/lib/action-state";

type ProjectOption = { id: string; title: string };

function TaskFields({ projectId, projectTitle, projects }: { projectId?: string; projectTitle?: string; projects?: ProjectOption[] }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {projectId ? <>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">Project</span><p className="font-semibold text-slate-800">{projectTitle ?? "Current project"}</p></div>
    </> : <label className="sm:col-span-2 text-sm font-medium text-slate-700">Project<select name="projectId" required className={`${inputClass} mt-1.5`}><option value="">Select a project</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
    <label className="sm:col-span-2 text-sm font-medium text-slate-700">Title<input name="title" required minLength={2} className={`${inputClass} mt-1.5`} placeholder="Define the next concrete outcome" /></label>
    <label className="sm:col-span-2 text-sm font-medium text-slate-700">Description<textarea name="description" rows={4} className={`${inputClass} mt-1.5`} placeholder="Context, acceptance criteria, or useful notes" /></label>
    <label className="text-sm font-medium text-slate-700">Status<select name="status" defaultValue="todo" className={`${inputClass} mt-1.5`}><option value="backlog">Backlog</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
    <label className="text-sm font-medium text-slate-700">Priority<PrioritySelect name="priority" defaultValue="medium" className="mt-1.5" /></label>
    <label className="text-sm font-medium text-slate-700">Due date<input name="dueDate" type="date" className={`${inputClass} mt-1.5`} /></label>
  </div>;
}

export function CreateTaskDialog({ projectId, projectTitle, projects, label = "Add task" }: { projectId?: string; projectTitle?: string; projects?: ProjectOption[]; label?: string }) {
  return <MutationDialog
    trigger={<Button type="button"><Plus size={16} />{label}</Button>}
    title="Add task"
    description={projectId ? `Create a task in ${projectTitle ?? "this project"}.` : "Create a task and choose its project."}
    action={createTaskAction}
    submitLabel="Create task"
  ><TaskFields projectId={projectId} projectTitle={projectTitle} projects={projects} /></MutationDialog>;
}

function SubmitTaskButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Creating…" : "Add task"}</Button>;
}

export function TaskForm({ projectId, projectTitle, projects }: { projectId?: string; projectTitle?: string; projects?: ProjectOption[] }) {
  const [state, action] = useActionState(createTaskAction, initialMutationState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state]);
  return <form ref={formRef} action={action} className="space-y-5">
    <TaskFields projectId={projectId} projectTitle={projectTitle} projects={projects} />
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "rounded-xl bg-red-50 p-3 text-sm text-red-700" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{state.message}</p>}
    <SubmitTaskButton />
  </form>;
}
