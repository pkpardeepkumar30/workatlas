import { createTask } from "@/app/actions";
import { Button, inputClass } from "@/components/ui";

export function TaskForm({ projectId, projects }: { projectId?: string; projects?: Array<{ id: string; title: string }> }) {
  return (
    <form action={createTask} className="grid gap-4 sm:grid-cols-2">
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : (
        <label className="sm:col-span-2 text-sm font-medium text-slate-700">Project
          <select name="projectId" required className={`${inputClass} mt-1.5`}>
            <option value="">Select a project</option>
            {projects?.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
      )}
      <label className="sm:col-span-2 text-sm font-medium text-slate-700">Task
        <input name="title" required minLength={2} className={`${inputClass} mt-1.5`} placeholder="Implement conservative boundary flux" />
      </label>
      <label className="text-sm font-medium text-slate-700">Status
        <select name="status" defaultValue="todo" className={`${inputClass} mt-1.5`}>
          <option value="backlog">Backlog</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">Priority
        <select name="priority" defaultValue="medium" className={`${inputClass} mt-1.5`}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">Due date
        <input name="dueDate" type="date" className={`${inputClass} mt-1.5`} />
      </label>
      <div className="self-end"><Button>Add task</Button></div>
    </form>
  );
}
