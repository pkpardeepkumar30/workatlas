import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteProjectDialog, EditProjectDialog } from "@/components/project-actions";
import { DeleteTaskDialog, EditTaskDialog } from "@/components/task-actions";
import { CreateTaskDialog } from "@/components/task-form";
import { PriorityBadge } from "@/components/priority";
import { Badge, Card, CardContent } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProject, getProjectOptions, getProjectTasks, type ProjectTaskSort } from "@/lib/queries";
import { formatDate, statusLabel } from "@/lib/utils";

const sorts = new Set<ProjectTaskSort>(["priority", "due", "status", "created"]);

export default async function ProjectDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const requestedSort = (await searchParams).sort as ProjectTaskSort | undefined;
  const sort = requestedSort && sorts.has(requestedSort) ? requestedSort : "due";
  const [project, tasks, projectOptions] = await Promise.all([
    getProject(user.id, id),
    getProjectTasks(user.id, id, sort),
    getProjectOptions(user.id),
  ]);
  if (!project) notFound();
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const openTasks = tasks.length - completedTasks;
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap gap-2"><Badge>{statusLabel(project.status)}</Badge><Badge>{project.area}</Badge><PriorityBadge priority={project.priority} /></div>
        <h1 className="mt-3 text-3xl font-bold">{project.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{project.description || "No project description yet."}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <CreateTaskDialog projectId={project.id} projectTitle={project.title} />
        <EditProjectDialog project={project} />
        <DeleteProjectDialog project={project} taskCount={tasks.length} redirectTo="/dashboard/projects" />
      </div>
    </div>
    <div className="mt-7 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Tasks</p><p className="mt-2 text-2xl font-bold">{tasks.length}</p></CardContent></Card>
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Open</p><p className="mt-2 text-2xl font-bold">{openTasks}</p></CardContent></Card>
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Completed</p><p className="mt-2 text-2xl font-bold">{completedTasks}</p></CardContent></Card>
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Next action</p><p className="mt-2 font-medium">{project.nextAction || "Not defined"}</p></CardContent></Card>
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Priority</p><div className="mt-2"><PriorityBadge priority={project.priority} /></div></CardContent></Card>
      <Card><CardContent><p className="text-xs uppercase tracking-wide text-slate-400">Target date</p><p className="mt-2 font-medium">{formatDate(project.targetDate)}</p></CardContent></Card>
    </div>
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="font-bold">Project tasks</h2><p className="mt-1 text-xs text-slate-500">{openTasks} open · {completedTasks} completed</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2"><label htmlFor="task-sort" className="text-xs font-medium text-slate-500">Sort</label><select id="task-sort" name="sort" defaultValue={sort} className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="priority">Priority</option><option value="due">Due date</option><option value="status">Status</option><option value="created">Creation date</option></select><button className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold">Apply</button></form>
          <CreateTaskDialog projectId={project.id} projectTitle={project.title} />
        </div>
      </div>
      <CardContent className="space-y-3">
        {tasks.map((task) => <article key={task.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="font-medium">{task.title}</p><p className="mt-1 text-sm text-slate-500">{task.description || "No description"}</p></div>
            <div className="flex flex-wrap gap-2"><PriorityBadge priority={task.priority} /><Badge>{statusLabel(task.status)}</Badge></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex gap-4 text-xs text-slate-500"><span>Due {formatDate(task.dueDate)}</span><Link href="/dashboard/kanban" className="font-semibold text-indigo-600">View in Kanban</Link></div>
            <div className="flex gap-2"><EditTaskDialog task={task} projects={projectOptions} /><DeleteTaskDialog task={task} /></div>
          </div>
        </article>)}
        {tasks.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><p className="font-medium">No tasks in this project yet</p><p className="mt-1 text-sm text-slate-500">Add the first concrete action to start moving this project forward.</p></div>}
      </CardContent>
    </Card>
  </div>;
}
