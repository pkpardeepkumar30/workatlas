import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { SiteHeader } from "@/components/site-header";
import { getContentDocument, listContentDocuments } from "@/lib/content";

export async function generateStaticParams() {
  return (await listContentDocuments("docs")).map((doc) => ({ slug: doc.slug }));
}

async function loadDocument(slug: string) {
  try {
    return await getContentDocument("docs", slug);
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/docs/${slug}` },
  };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 sm:px-10 sm:py-8">
          <p className="text-sm font-semibold text-indigo-600">Documentation</p>
          <Markdown>{`# ${doc.title}\n\n${doc.body}`}</Markdown>
        </div>
      </main>
    </div>
  );
}
