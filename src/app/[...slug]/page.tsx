import type { Metadata } from "next";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import { getPageConfig, listPageConfigs } from "@/config/loader";

function routeFromSlug(slug: string[]) {
  return `/${slug.join("/")}`;
}

export async function generateStaticParams() {
  return (await listPageConfigs())
    .filter((page) => page.published && page.route !== "/")
    .map((page) => ({ slug: page.route.slice(1).split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const route = routeFromSlug(slug);
  const page = await getPageConfig(route);
  return page ? { title: page.title, description: page.description, alternates: { canonical: route } } : {};
}

export default async function ConfiguredPublicPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <PublicPageRenderer route={routeFromSlug(slug)} />;
}
