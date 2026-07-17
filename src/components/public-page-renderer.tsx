import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getFeaturesConfig, getPageConfig } from "@/config/loader";
import { isFeatureEnabled } from "@/config/features";
import { sectionRegistry } from "@/registries/sections";

export async function PublicPageRenderer({ route }: { route: string }) {
  const [page, features] = await Promise.all([getPageConfig(route), getFeaturesConfig()]);
  if (!page || (route !== "/" && !features.publicPages)) notFound();

  const sections = page.sections.filter((section) => isFeatureEnabled(features, section.feature));
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>
        {sections.map((section, index) => {
          const renderSection = sectionRegistry[section.type];
          return <div key={section.id ?? `${section.type}-${index}`}>{renderSection(section)}</div>;
        })}
      </main>
    </div>
  );
}

