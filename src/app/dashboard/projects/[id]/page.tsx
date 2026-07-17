import { notFound } from "next/navigation";
import { DeleteProjectDialog, EditProjectDialog } from "@/components/project-actions";
import { DeleteTaskDialog, EditTaskDialog } from "@/components/task-actions";
import { TaskForm } from "@/components/task-form";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProject, getProjectOptions, getProjectTasks } from "@/lib/queries";
import { formatDate, statusLabel } from "@/lib/utils";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [project, tasks, projectOptions] = await Promise.all([
    getProject(user.id, id),
    getProjectTasks(user.id, id),
    getProjectOptions(user.id),
  ]);
  if (!project) notFound();
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex gap-2"><Badge>{statusLabel(project.status)}</Badge><Badge>{project.area}</Badge></div>
          <h1 className="mt-3 text-3xl font-bold">{project.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-600">{project.description || "No project description yet."}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <EditProjectDialog project={project} />
          <DeleteProjectDialog project={project} taskCount={tasks.length} redirectTo="/dashboard/projects" />
        </div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Next action</p><p className="mt-2 font-medium">{project.nextAction || "Not defined"}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Priority</p><p className="mt-2 font-medium">{statusLabel(project.priority)}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Target date</p><p className="mt-2 font-medium">{formatDate(project.targetDate)}</p></CardContent></Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><h2 className="font-bold">Tasks</h2></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-slate-500">Due {formatDate(task.dueDate)}</p></div>
                  <Badge>{statusLabel(task.status)}</Badge>
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
        <Card className="h-fit"><CardHeader><h2 className="font-bold">Add task</h2></CardHeader><CardContent><TaskForm projectId={project.id} /></CardContent></Card>
      </div>
    </div>
  );
}
