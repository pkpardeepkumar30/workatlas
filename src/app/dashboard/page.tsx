import { ArrowRight } from "lucide-react";
import { ActionControl } from "@/components/action-control";
import { getDashboardConfig, getFeaturesConfig } from "@/config/loader";
import { isFeatureEnabled } from "@/config/features";
import { requireUser } from "@/lib/auth";
import { getProjectOptions, getProjects, getTasks } from "@/lib/queries";
import { dashboardWidgetRegistry, type DashboardData } from "@/registries/dashboard-widgets";

export default async function DashboardPage() {
  const user = await requireUser();
  const [projects, tasks, projectOptions, config, features] = await Promise.all([
    getProjects(user.id),
    getTasks(user.id),
    getProjectOptions(user.id),
    getDashboardConfig(),
    getFeaturesConfig(),
  ]);
  const activeProjects = projects.filter((project) => project.status === "active").length;
  const ideas = projects.filter((project) => project.status === "idea").length;
  const openTasks = tasks.filter((task) => task.status !== "done");
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today).length;
  const data: DashboardData = {
    metrics: { activeProjects, ideas, openTasks: openTasks.length, overdueTasks },
    projects,
    projectOptions,
    openTasks,
  };
  const widgets = config.widgets.filter((widget) => isFeatureEnabled(features, widget.feature));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">{config.heading.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{config.heading.welcomePrefix}, {user.name}</h1>
          <p className="mt-2 text-slate-500">{config.heading.description}</p>
        </div>
        <div className="relative">
          <ActionControl button={config.heading.button} className="gap-2 pr-10" />
          <ArrowRight size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {widgets.map((widget) => {
          const renderWidget = dashboardWidgetRegistry[widget.type];
          return <section key={widget.id} className={widget.type === "metricGrid" ? "xl:col-span-2" : undefined}>{renderWidget(widget, data)}</section>;
        })}
      </div>
    </div>
  );
}
