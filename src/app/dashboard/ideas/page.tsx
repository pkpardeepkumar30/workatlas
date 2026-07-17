import { createIdea } from "@/app/actions";
import { PriorityBadge, PrioritySelect } from "@/components/priority";
import { Button, Card, CardContent, CardHeader, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getIdeas } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function IdeasPage() {
  const user = await requireUser();
  const ideas = await getIdeas(user.id);
  return <div><h1 className="text-3xl font-bold">Idea inbox</h1><p className="mt-2 text-slate-500">Capture first. Decide later whether an idea deserves commitment.</p><div className="mt-8 grid gap-6 xl:grid-cols-[1fr_400px]"><Card><CardHeader><h2 className="font-bold">Uncommitted ideas</h2></CardHeader><CardContent className="space-y-4">{ideas.map((idea) => <div key={idea.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{idea.title}</p><p className="mt-1 text-sm text-slate-500">{idea.description || "No description"}</p></div><PriorityBadge priority={idea.priority} /></div><p className="mt-3 text-xs text-slate-400">Captured {formatDate(idea.createdAt)}</p></div>)}{ideas.length === 0 && <p className="text-sm text-slate-500">The inbox is empty.</p>}</CardContent></Card><Card className="h-fit"><CardHeader><h2 className="font-bold">Capture idea</h2></CardHeader><CardContent><form action={createIdea} className="space-y-4"><label className="block text-sm font-medium">Title<input name="title" required className={`${inputClass} mt-1.5`} placeholder="New paper or solver concept" /></label><label className="block text-sm font-medium">Area<input name="area" className={`${inputClass} mt-1.5`} placeholder="Numerical methods" /></label><label className="block text-sm font-medium">Notes<textarea name="description" rows={4} className={`${inputClass} mt-1.5`} /></label><label className="block text-sm font-medium">Priority<PrioritySelect name="priority" defaultValue="medium" className="mt-1.5" /></label><Button>Save idea</Button></form></CardContent></Card></div></div>;
}
