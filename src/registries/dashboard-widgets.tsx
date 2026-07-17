import Link from "next/link";
import { DeleteTaskDialog, EditTaskDialog } from "@/components/task-actions";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { PriorityBadge } from "@/components/priority";
import type { DashboardWidget } from "@/config/schemas";
import type { getProjects, getTasks } from "@/lib/queries";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import { iconRegistry } from "@/registries/icons";

type Project = Awaited<ReturnType<typeof getProjects>>[number];
type Task = Awaited<ReturnType<typeof getTasks>>[number];

export type DashboardData = {
  metrics: Record<"activeProjects" | "ideas" | "openTasks" | "overdueTasks", number>;
  projects: Project[];
  projectOptions: Array<{ id: string; title: string }>;
  openTasks: Task[];
};

type WidgetRenderer = (widget: DashboardWidget, data: DashboardData) => React.ReactNode;

function MetricGrid(widget: DashboardWidget, data: DashboardData) {
  if (widget.type !== "metricGrid") return null;
  const columns = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 xl:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4" }[widget.columns];
  return (
    <div className={cn("grid gap-4", columns)}>
      {widget.metrics.map((metric) => {
        const Icon = iconRegistry[metric.icon];
        return (
          <Card key={metric.value}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500">{metric.label}</p><p className="mt-2 text-3xl font-bold">{data.metrics[metric.value]}</p></div>
                <span className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon size={20} /></span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ProjectList(widget: DashboardWidget, data: DashboardData) {
  if (widget.type !== "projectList") return null;
  return (
    <Card className="h-full">
      <CardHeader><h2 className="font-bold">{widget.title}</h2></CardHeader>
      <CardContent className="space-y-4">
        {data.projects.slice(0, widget.limit).map((project) => (
          <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="block rounded-xl border border-slate-200 p-4 hover:border-indigo-300">
            <div className="flex justify-between gap-3"><div><p className="font-semibold">{project.title}</p><p className="mt-1 text-sm text-slate-500">{project.nextAction || "No next action defined"}</p></div><Badge>{statusLabel(project.status)}</Badge></div>
          </Link>
        ))}
        {data.projects.length === 0 && <p className="text-sm text-slate-500">Create your first project to populate this view.</p>}
      </CardContent>
    </Card>
  );
}

function TaskList(widget: DashboardWidget, data: DashboardData) {
  if (widget.type !== "taskList") return null;
  const projectOptions = data.projectOptions;
  return (
    <Card className="h-full">
      <CardHeader><h2 className="font-bold">{widget.title}</h2></CardHeader>
      <CardContent className="space-y-4">
        {data.openTasks.slice(0, widget.limit).map((task) => (
          <div key={task.id} className="border-b border-slate-100 pb-3 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.projectTitle}</p></div>
              <span className="text-xs text-slate-500">{task.dueDate ? formatDate(task.dueDate) : "Unscheduled"}</span>
            </div>
            <div className="mt-2"><PriorityBadge priority={task.priority} /></div>
            <div className="mt-2 flex flex-wrap items-start justify-end gap-2">
              <EditTaskDialog task={task} projects={projectOptions} />
              <DeleteTaskDialog task={task} />
            </div>
          </div>
        ))}
        {data.openTasks.length === 0 && <p className="text-sm text-slate-500">No open tasks.</p>}
      </CardContent>
    </Card>
  );
}

export const dashboardWidgetRegistry = {
  metricGrid: MetricGrid,
  projectList: ProjectList,
  taskList: TaskList,
} satisfies Record<DashboardWidget["type"], WidgetRenderer>;
