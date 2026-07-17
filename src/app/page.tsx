import type { Metadata } from "next";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import { getPageConfig } from "@/config/loader";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageConfig("/");
  return page ? { title: page.title, description: page.description } : {};
}

export default function HomePage() {
  return <PublicPageRenderer route="/" />;
}

