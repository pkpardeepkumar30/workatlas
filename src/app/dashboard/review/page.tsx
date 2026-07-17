import { AlertTriangle, CalendarClock, CircleOff, Target } from "lucide-react";
import { PriorityBadge } from "@/components/priority";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { Priority } from "@/lib/priority-config";
import { getProjects, getTasks } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

type ReviewItem = { name: string; detail: string; priority: Priority };

export default async function ReviewPage() {
  const user = await requireUser();
  const [projects, tasks] = await Promise.all([getProjects(user.id), getTasks(user.id)]);
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
  const sections: Array<{ title: string; icon: typeof Target; items: ReviewItem[] }> = [
    { title: "Missing next action", icon: Target, items: projects.filter((project) => ["planned", "active"].includes(project.status) && !project.nextAction.trim()).map((project) => ({ name: project.title, detail: project.area, priority: project.priority })) },
    { title: "Overdue tasks", icon: CalendarClock, items: tasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate < today).map((task) => ({ name: task.title, detail: `${task.projectTitle} · ${formatDate(task.dueDate)}`, priority: task.priority })) },
    { title: "Stale active projects", icon: CircleOff, items: projects.filter((project) => project.status === "active" && project.updatedAt < twoWeeksAgo).map((project) => ({ name: project.title, detail: `Last updated ${formatDate(project.updatedAt)}`, priority: project.priority })) },
    { title: "Blocked tasks", icon: AlertTriangle, items: tasks.filter((task) => task.status === "blocked").map((task) => ({ name: task.title, detail: task.projectTitle, priority: task.priority })) },
  ];
  return <div><h1 className="text-3xl font-bold">Weekly review</h1><p className="mt-2 text-slate-500">A focused attention list for keeping commitments current and actionable.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{sections.map(({ title, icon: Icon, items }) => <Card key={title}><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon size={18} /></span><div><h2 className="font-bold">{title}</h2><p className="text-xs text-slate-400">{items.length} item{items.length === 1 ? "" : "s"}</p></div></div></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={`${item.name}-${item.detail}`} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><p className="font-medium">{item.name}</p><PriorityBadge priority={item.priority} /></div><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div>)}{items.length === 0 && <p className="text-sm text-emerald-700">No issues detected.</p>}</CardContent></Card>)}</div></div>;
}
