import type { MetadataRoute } from "next";
import { listPageConfigs } from "@/config/loader";
import { listContentDocuments } from "@/lib/content";
import { getPublicEnvironment } from "@/lib/public-env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { appUrl } = getPublicEnvironment();
  const [pages, docs] = await Promise.all([
    listPageConfigs(),
    listContentDocuments("docs"),
  ]);
  const routes = [
    ...pages.filter((page) => page.published).map((page) => page.route),
    "/docs",
    ...docs.map((doc) => `/docs/${doc.slug}`),
  ];

  return [...new Set(routes)].map((route) => ({
    url: new URL(route, appUrl).toString(),
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
