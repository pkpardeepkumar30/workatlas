import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listContentDocuments } from "@/lib/content";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides for configuring, deploying, and extending WorkAtlas.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage() {
  const docs = await listContentDocuments("docs");
  return <div className="min-h-screen bg-slate-50"><SiteHeader /><main className="mx-auto max-w-5xl px-5 py-16 lg:px-8"><p className="text-sm font-semibold text-indigo-600">Documentation</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Edit these pages using Markdown only.</h1><p className="mt-4 max-w-2xl text-slate-600">Files live under <code className="rounded bg-slate-200 px-1.5 py-0.5">content/docs</code>. Front matter controls titles, descriptions and ordering.</p><div className="mt-10 grid gap-5 sm:grid-cols-2">{docs.map((doc) => <Link key={doc.slug} href={`/docs/${doc.slug}`} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"><h2 className="font-bold text-slate-950">{doc.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{doc.description}</p></Link>)}</div></main></div>;
}
