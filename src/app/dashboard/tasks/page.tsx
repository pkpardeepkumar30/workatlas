import { DeleteTaskDialog, EditTaskDialog } from "@/components/task-actions";
import { TaskForm } from "@/components/task-form";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProjectOptions, getProjects, getTasks } from "@/lib/queries";
import { formatDate, statusLabel } from "@/lib/utils";

export default async function TasksPage() {
  const user = await requireUser();
  const [projects, tasks, projectOptions] = await Promise.all([getProjects(user.id), getTasks(user.id), getProjectOptions(user.id)]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Tasks</h1>
      <p className="mt-2 text-slate-500">Concrete actions across the complete project portfolio.</p>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><h2 className="font-bold">All tasks</h2></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.projectTitle} · {formatDate(task.dueDate)}</p></div>
                  <div className="flex items-center gap-2"><Badge>{statusLabel(task.status)}</Badge><Badge>{statusLabel(task.priority)}</Badge></div>
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-end gap-2">
                  <EditTaskDialog task={task} projects={projectOptions} />
                  <DeleteTaskDialog task={task} />
                </div>
              </article>
            ))}
            {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><h2 className="font-bold">Add task</h2></CardHeader>
          <CardContent>{projects.length ? <TaskForm projects={projectOptions} /> : <p className="text-sm text-slate-500">Create a project before adding tasks.</p>}</CardContent>
        </Card>
      </div>
    </div>
  );
}
