"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { persistKanbanAction } from "@/app/actions";
import { DeleteTaskDialog, EditTaskDialog, type EditableTask, type ProjectOption } from "@/components/task-actions";
import { Card, CardContent } from "@/components/ui";
import { PriorityBadge } from "@/components/priority";
import { priorityConfig } from "@/lib/priority-config";
import { taskStatuses } from "@/lib/mutation-schemas";
import { cn, statusLabel } from "@/lib/utils";

export type KanbanTask = EditableTask & {
  projectTitle: string;
  position: number;
};

function normalise(tasks: KanbanTask[]) {
  return taskStatuses.flatMap((status) =>
    tasks.filter((task) => task.status === status).map((task, position) => ({ ...task, position })),
  );
}

function SortableTaskCard({ task, projects, disabled }: { task: KanbanTask; projects: ProjectOption[]; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Card className={cn("touch-manipulation border-l-4", priorityConfig[task.priority].indicatorClass, isDragging && "opacity-40 ring-2 ring-indigo-500 ring-offset-2")}>
        <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing disabled:cursor-wait"
            aria-label={`Move ${task.title}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{task.title}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{task.projectTitle}</p>
            <div className="mt-3"><PriorityBadge priority={task.priority} /></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-end gap-2 border-t border-slate-100 pt-3">
          <EditTaskDialog task={task} projects={projects} />
          <DeleteTaskDialog task={task} />
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  projects,
  disabled,
}: {
  status: KanbanTask["status"];
  tasks: KanbanTask[];
  projects: ProjectOption[];
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled });
  return (
    <section aria-labelledby={`column-${status}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`column-${status}`} className="text-sm font-bold">{statusLabel(status)}</h2>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-32 space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-100/60 p-2 transition",
          isOver && "border-indigo-400 bg-indigo-50",
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <SortableTaskCard key={task.id} task={task} projects={projects} disabled={disabled} />)}
        </SortableContext>
        {tasks.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">Drop tasks here</p>}
      </div>
    </section>
  );
}

export function KanbanBoard({ initialTasks, projects }: { initialTasks: KanbanTask[]; projects: ProjectOption[] }) {
  const [tasks, setTasks] = useState(() => normalise(initialTasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = useMemo(() => tasks.find((task) => task.id === activeId) ?? null, [activeId, tasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setFeedback(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask) return;
    const overId = String(over.id);
    const destinationStatus = taskStatuses.includes(overId as KanbanTask["status"])
      ? overId as KanbanTask["status"]
      : tasks.find((task) => task.id === overId)?.status;
    if (!destinationStatus) return;

    const previous = tasks;
    let next: KanbanTask[];
    if (activeTask.status === destinationStatus) {
      const column = tasks.filter((task) => task.status === destinationStatus);
      const oldIndex = column.findIndex((task) => task.id === activeTask.id);
      const overIndex = overId === destinationStatus ? column.length - 1 : column.findIndex((task) => task.id === overId);
      if (oldIndex < 0 || overIndex < 0 || oldIndex === overIndex) return;
      const reordered = arrayMove(column, oldIndex, overIndex);
      next = normalise(tasks.filter((task) => task.status !== destinationStatus).concat(reordered));
    } else {
      const destination = tasks.filter((task) => task.status === destinationStatus);
      const insertAt = overId === destinationStatus ? destination.length : Math.max(0, destination.findIndex((task) => task.id === overId));
      const moved = { ...activeTask, status: destinationStatus };
      destination.splice(insertAt, 0, moved);
      next = normalise(tasks.filter((task) => task.id !== activeTask.id && task.status !== destinationStatus).concat(destination));
    }

    setTasks(next);
    setSaving(true);
    const result = await persistKanbanAction(next.map(({ id, status, position }) => ({ id, status, position })));
    setSaving(false);
    if (!result.ok) {
      setTasks(previous);
      setFeedback({ kind: "error", message: `${result.message} The previous board order was restored.` });
      return;
    }
    setFeedback({ kind: "success", message: result.message });
  }

  return (
    <div>
      <div className="mt-5 flex min-h-6 items-center justify-between gap-4">
        <p className="text-xs text-slate-500">Drag by the handle, or focus it and press Space to move with the keyboard.</p>
        {saving && <p className="text-xs font-semibold text-indigo-600" role="status">Saving order…</p>}
      </div>
      {feedback && (
        <p className={cn("mt-3 rounded-xl px-4 py-3 text-sm", feedback.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      )}
      {tasks.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No tasks yet. Create a task to populate the board.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {taskStatuses.map((status) => (
            <KanbanColumn key={status} status={status} tasks={tasks.filter((task) => task.status === status)} projects={projects} disabled={saving} />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <Card className={cn("w-64 rotate-2 border-l-4 shadow-xl ring-2 ring-indigo-500", priorityConfig[activeTask.priority].indicatorClass)}><CardContent className="p-4"><p className="font-medium">{activeTask.title}</p><p className="mt-1 text-xs text-slate-500">{activeTask.projectTitle}</p><div className="mt-3"><PriorityBadge priority={activeTask.priority} /></div></CardContent></Card>}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
