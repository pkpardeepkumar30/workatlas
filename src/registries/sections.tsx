import { ActionControl } from "@/components/action-control";
import { Markdown } from "@/components/markdown";
import { ShowcaseGallery } from "@/components/showcase-gallery";
import type { PageSection } from "@/config/schemas";
import { getContentDocument } from "@/lib/content";
import { cn } from "@/lib/utils";
import { iconRegistry } from "@/registries/icons";

type SectionRenderer = (section: PageSection) => React.ReactNode | Promise<React.ReactNode>;

function HeroSection(section: PageSection) {
  if (section.type !== "hero") return null;
  const centered = section.layout === "centered";

  return (
    <section id={section.id} className="overflow-hidden border-b border-slate-200 bg-white">
      <div
        className={cn(
          "mx-auto max-w-7xl gap-12 px-5 py-20 lg:px-8 lg:py-28",
          centered ? "text-center" : "grid lg:grid-cols-[1.2fr_.8fr]",
        )}
      >
        <div className={cn(centered && "mx-auto max-w-4xl")}>
          {section.eyebrow && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              {section.eyebrow}
            </span>
          )}
          <h1 className="mt-6 text-5xl font-bold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            {section.title}
          </h1>
          {section.description && (
            <p className={cn("mt-6 text-lg leading-8 text-slate-600", centered && "mx-auto max-w-3xl")}>
              {section.description}
            </p>
          )}
        </div>
        {section.callout && !centered && (
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{section.callout.title}</span>
              {section.callout.badge && (
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-300">
                  {section.callout.badge}
                </span>
              )}
            </div>
            <div className="mt-6 space-y-3">
              {section.callout.items.map((item, index) => (
                <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-500 text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{item}</p>
                      <p className="mt-1 text-sm text-slate-400">Next action is explicitly defined</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

async function MarkdownSection(section: PageSection) {
  if (section.type !== "markdown") return null;
  const document = await getContentDocument("pages", section.source.replace(/\.md$/, ""));
  return (
    <section id={section.id} className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <article className="rounded-3xl border border-slate-200 bg-white px-6 py-4 sm:px-10 sm:py-8">
        <Markdown>{document.body}</Markdown>
      </article>
    </section>
  );
}

function FeatureGridSection(section: PageSection) {
  if (section.type !== "featureGrid") return null;
  const gridColumns = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[section.columns];
  return (
    <section id={section.id} className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className={cn("grid gap-5", gridColumns)}>
        {section.items.map((item) => {
          const Icon = iconRegistry[item.icon];
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <Icon className="text-indigo-600" />
              <h2 className="mt-5 font-bold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ButtonGroupSection(section: PageSection) {
  if (section.type !== "buttonGroup") return null;
  const alignment = { left: "justify-start", center: "justify-center", right: "justify-end" }[section.alignment];
  return (
    <section id={section.id} className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <div className={cn("flex flex-wrap gap-3", alignment)}>
        {section.buttons.map((button) => <ActionControl key={`${button.action}-${button.label}`} button={button} />)}
      </div>
    </section>
  );
}

async function ShowcaseSection(section: PageSection) {
  if (section.type !== "showcase") return null;
  const document = await getContentDocument("pages", section.source.replace(/\.md$/, ""));
  return <section id={section.id} className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-10"><Markdown>{document.body}</Markdown><ShowcaseGallery items={section.items} /></div></section>;
}

export const sectionRegistry = {
  hero: HeroSection,
  markdown: MarkdownSection,
  featureGrid: FeatureGridSection,
  buttonGroup: ButtonGroupSection,
  showcase: ShowcaseSection,
} satisfies Record<PageSection["type"], SectionRenderer>;
