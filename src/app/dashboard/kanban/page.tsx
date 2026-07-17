import { KanbanBoard } from "@/components/kanban-board";
import { requireUser } from "@/lib/auth";
import { getKanbanTasks, getProjectOptions } from "@/lib/queries";

export default async function KanbanPage() {
  const user = await requireUser();
  const [tasks, projects] = await Promise.all([getKanbanTasks(user.id), getProjectOptions(user.id)]);
  const boardVersion = tasks.map((task) => `${task.id}:${task.status}:${task.position}:${task.updatedAt.getTime()}`).join("|");
  return (
    <div>
      <h1 className="text-3xl font-bold">Kanban</h1>
      <p className="mt-2 text-slate-500">Reorder tasks within a column or move them between statuses. Changes persist automatically.</p>
      <KanbanBoard key={boardVersion} initialTasks={tasks} projects={projects.map(({ id, title }) => ({ id, title }))} />
    </div>
  );
}
