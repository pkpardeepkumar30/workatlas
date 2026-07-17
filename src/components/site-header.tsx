import Link from "next/link";
import { ActionControl } from "@/components/action-control";
import { isFeatureEnabled } from "@/config/features";
import { getFeaturesConfig, getNavigationConfig, getSiteConfig } from "@/config/loader";
import type { ButtonConfig, NavigationItem } from "@/config/schemas";
import { getCurrentUser, isRegistrationEnabled } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { iconRegistry } from "@/registries/icons";

function isVisible(item: NavigationItem, authenticated: boolean) {
  return item.visibility === "all" || (item.visibility === "authenticated" ? authenticated : !authenticated);
}

export async function SiteHeader() {
  const [user, site, navigation, features] = await Promise.all([
    getCurrentUser(),
    getSiteConfig(),
    getNavigationConfig(),
    getFeaturesConfig(),
  ]);
  const Logo = iconRegistry[site.branding.logoIcon];
  const items = navigation.public.filter(
    (item) => isVisible(item, Boolean(user)) && isFeatureEnabled(features, item.feature)
      && (item.action !== "createAccount" || isRegistrationEnabled()),
  );

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-5 py-2 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-slate-950">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><Logo size={18} /></span>
          <span className="hidden sm:inline">{site.name}</span>
          <span className="sm:hidden">{site.shortName}</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-medium text-slate-600" aria-label="Primary navigation">
          {items.map((item) => {
            if (item.href) {
              return <Link key={`${item.label}-${item.href}`} href={item.href} className="hover:text-slate-950">{item.label}</Link>;
            }
            const button: ButtonConfig = {
              label: item.label,
              action: item.action!,
              variant: item.variant === "primary" ? "dark" : "text",
            };
            return <ActionControl key={`${item.label}-${item.action}`} button={button} className={cn(item.variant === "default" && "px-0")} />;
          })}
        </nav>
      </div>
    </header>
  );
}
