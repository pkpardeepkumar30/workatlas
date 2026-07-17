import { createProject } from "@/app/actions";
import { Button, inputClass } from "@/components/ui";

export function ProjectForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action={createProject} className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2 text-sm font-medium text-slate-700">Project title
        <input name="title" required minLength={2} className={`${inputClass} mt-1.5`} placeholder="Mimetic FVTD benchmark" />
      </label>
      <label className="text-sm font-medium text-slate-700">Area
        <input name="area" className={`${inputClass} mt-1.5`} placeholder="Electromagnetics" />
      </label>
      <label className="text-sm font-medium text-slate-700">Status
        <select name="status" defaultValue="idea" className={`${inputClass} mt-1.5`}>
          <option value="idea">Idea</option><option value="planned">Planned</option><option value="active">Active</option><option value="waiting">Waiting</option><option value="completed">Completed</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">Priority
        <select name="priority" defaultValue="medium" className={`${inputClass} mt-1.5`}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">Target date
        <input name="targetDate" type="date" className={`${inputClass} mt-1.5`} />
      </label>
      {!compact && (
        <label className="sm:col-span-2 text-sm font-medium text-slate-700">Description
          <textarea name="description" rows={3} className={`${inputClass} mt-1.5`} placeholder="What outcome should this project produce?" />
        </label>
      )}
      <label className="sm:col-span-2 text-sm font-medium text-slate-700">Next action
        <input name="nextAction" className={`${inputClass} mt-1.5`} placeholder="Define the first reproducible test case" />
      </label>
      <div className="sm:col-span-2"><Button>Create project</Button></div>
    </form>
  );
}
