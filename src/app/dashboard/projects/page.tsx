import Link from "next/link";
import { ProjectActionMenu } from "@/components/project-actions";
import { ProjectForm } from "@/components/project-form";
import { PriorityBadge } from "@/components/priority";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProjects } from "@/lib/queries";
import { formatDate, statusLabel } from "@/lib/utils";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjects(user.id);

  return (
    <div>
      <h1 className="text-3xl font-bold">Projects</h1>
      <p className="mt-2 text-slate-500">A structured portfolio of ideas, planned work and active commitments.</p>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><h2 className="font-bold">Project portfolio</h2></CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/dashboard/projects/${project.id}`} className="font-semibold hover:text-indigo-600">{project.title}</Link>
                    <p className="mt-1 text-sm text-slate-500">{project.area} · {project.nextAction || "Missing next action"}</p>
                  </div>
                  <div className="flex gap-2"><Badge>{statusLabel(project.status)}</Badge><PriorityBadge priority={project.priority} /></div>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-xs text-slate-400">Target: {formatDate(project.targetDate)}</p>
                  <ProjectActionMenu project={project} />
                </div>
              </article>
            ))}
            {projects.length === 0 && <p className="text-sm text-slate-500">No projects yet.</p>}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><h2 className="font-bold">Create project</h2></CardHeader>
          <CardContent><ProjectForm compact /></CardContent>
        </Card>
      </div>
    </div>
  );
}
