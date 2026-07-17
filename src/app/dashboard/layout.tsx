import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="min-h-screen bg-slate-50 lg:flex"><DashboardNav user={user} /><main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">{children}</main></div>;
}
