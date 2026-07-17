import { DataTransferManager } from "@/components/data-transfer-manager";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getDataTransferAuditLogs } from "@/lib/queries";

export default async function DataTransferPage() {
  const user = await requireUser();
  const activities = await getDataTransferAuditLogs(user.id);
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">Account data</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Export and import</h1>
      <p className="mt-2 mb-8 max-w-3xl text-slate-500">Create a portable personal backup or restore WorkAtlas data safely. Every operation is authenticated, owner-scoped and recorded.</p>
      <DataTransferManager />
      <Card className="mt-6">
        <CardHeader><h2 className="font-bold">Recent activity</h2></CardHeader>
        <CardContent className="space-y-3">
          {activities.map((activity) => <div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm">
            <div><p className="font-medium capitalize">{activity.action} · {activity.format.toUpperCase()}</p><p className="mt-1 text-xs text-slate-500">{activity.createdAt.toLocaleString()} · {activity.projectCount} projects · {activity.taskCount} tasks · {activity.commentCount} comments</p></div>
            <Badge className={activity.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{activity.status}</Badge>
          </div>)}
          {activities.length === 0 && <p className="text-sm text-slate-500">No export or import activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
