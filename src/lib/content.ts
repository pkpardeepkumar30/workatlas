import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const frontMatterSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  order: z.number().default(0),
  published: z.boolean().default(true),
});

export type ContentDocument = z.infer<typeof frontMatterSchema> & {
  slug: string;
  body: string;
};

const contentRoot = path.join(process.cwd(), "content");

export async function getContentDocument(section: string, slug: string) {
  const filePath = path.join(contentRoot, section, `${slug}.md`);
  const source = await fs.readFile(filePath, "utf8");
  const parsed = matter(source);
  return {
    ...frontMatterSchema.parse(parsed.data),
    slug,
    body: parsed.content,
  } satisfies ContentDocument;
}

export async function listContentDocuments(section: string) {
  const directory = path.join(contentRoot, section);
  const entries = await fs.readdir(directory);
  const documents = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".md"))
      .map((entry) => getContentDocument(section, entry.replace(/\.md$/, ""))),
  );
  return documents.filter((document) => document.published).sort((a, b) => a.order - b.order);
}
