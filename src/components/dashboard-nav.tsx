import Link from "next/link";
import { ActionControl } from "@/components/action-control";
import { isFeatureEnabled } from "@/config/features";
import { getFeaturesConfig, getNavigationConfig, getSiteConfig } from "@/config/loader";
import type { ButtonConfig, NavigationItem } from "@/config/schemas";
import type { SessionUser } from "@/lib/auth";
import { getRegisteredAction } from "@/registries/actions";
import { iconRegistry } from "@/registries/icons";

function NavigationLink({ item }: { item: NavigationItem }) {
  const Icon = item.icon ? iconRegistry[item.icon] : null;
  const classes = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white";
  const content = <>{Icon && <Icon size={17} />} {item.label}</>;
  if (item.href) return <Link href={item.href} className={classes}>{content}</Link>;

  const action = getRegisteredAction(item.action!);
  if (action.kind === "link") return <Link href={action.href} className={classes}>{content}</Link>;
  const button: ButtonConfig = { label: item.label, action: item.action!, variant: "text" };
  return <ActionControl button={button} className="w-full justify-start px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white" />;
}

export async function DashboardNav({ user }: { user: SessionUser }) {
  const [site, navigation, features] = await Promise.all([getSiteConfig(), getNavigationConfig(), getFeaturesConfig()]);
  const items = navigation.dashboard.filter((item) => isFeatureEnabled(features, item.feature));
  const footerItems = navigation.dashboardFooter.filter((item) => isFeatureEnabled(features, item.feature));

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-800">
      <div className="border-b border-slate-800 px-5 py-5">
        <Link href="/dashboard" className="font-bold">{site.name}</Link>
        <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
      </div>
      <nav className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-4 lg:block lg:flex-1" aria-label="Dashboard navigation">
        {items.map((item) => <NavigationLink key={`${item.label}-${item.href ?? item.action}`} item={item} />)}
      </nav>
      <div className="p-3">
        {footerItems.map((item) => <NavigationLink key={`${item.label}-${item.href ?? item.action}`} item={item} />)}
      </div>
    </aside>
  );
}

