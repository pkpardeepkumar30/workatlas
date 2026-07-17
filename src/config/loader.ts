import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import {
  dashboardConfigSchema,
  featuresConfigSchema,
  navigationConfigSchema,
  pageConfigSchema,
  siteConfigSchema,
  type DashboardConfig,
  type FeaturesConfig,
  type NavigationConfig,
  type PageConfig,
  type SiteConfig,
} from "@/config/schemas";

const configRoot = path.join(process.cwd(), "site-config");

export class ConfigurationError extends Error {
  constructor(filename: string, details: string[]) {
    super(`Invalid configuration in ${filename}:\n${details.map((detail) => `- ${detail}`).join("\n")}`);
    this.name = "ConfigurationError";
  }
}

function displayPath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

async function readYaml<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  const filename = displayPath(filePath);
  let source: string;

  try {
    source = await fs.readFile(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "File could not be read";
    throw new ConfigurationError(filename, [`<file>: ${message}`]);
  }

  return parseYamlConfiguration(filename, source, schema);
}

export function parseYamlConfiguration<T>(filename: string, source: string, schema: z.ZodType<T>): T {
  let value: unknown;
  try {
    value = YAML.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid YAML syntax";
    throw new ConfigurationError(filename, [`<yaml>: ${message}`]);
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConfigurationError(
      filename,
      result.error.issues.map((issue) => `${issue.path.length ? issue.path.join(".") : "<root>"}: ${issue.message}`),
    );
  }

  return result.data;
}

export function getSiteConfig(): Promise<SiteConfig> {
  return readYaml(path.join(configRoot, "site.yml"), siteConfigSchema);
}

export function getNavigationConfig(): Promise<NavigationConfig> {
  return readYaml(path.join(configRoot, "navigation.yml"), navigationConfigSchema);
}

export function getFeaturesConfig(): Promise<FeaturesConfig> {
  return readYaml(path.join(configRoot, "features.yml"), featuresConfigSchema);
}

export function getDashboardConfig(): Promise<DashboardConfig> {
  return readYaml(path.join(configRoot, "dashboard.yml"), dashboardConfigSchema);
}

export async function listPageConfigs(): Promise<PageConfig[]> {
  const pagesDirectory = path.join(configRoot, "pages");
  const entries = (await fs.readdir(pagesDirectory)).filter((entry) => /\.ya?ml$/.test(entry)).sort();
  const pages = await Promise.all(entries.map((entry) => readYaml(path.join(pagesDirectory, entry), pageConfigSchema)));
  const routes = new Set<string>();

  pages.forEach((page, index) => {
    if (routes.has(page.route)) {
      throw new ConfigurationError("site-config/pages", [`${index}.route: duplicate route ${page.route}`]);
    }
    routes.add(page.route);
  });

  return pages;
}

export async function getPageConfig(route: string) {
  return (await listPageConfigs()).find((page) => page.published && page.route === route) ?? null;
}

export async function validateAllConfiguration() {
  const [site, navigation, features, dashboard, pages] = await Promise.all([
    getSiteConfig(),
    getNavigationConfig(),
    getFeaturesConfig(),
    getDashboardConfig(),
    listPageConfigs(),
  ]);
  return { site, navigation, features, dashboard, pages };
}
