import { describe, expect, it } from "vitest";
import { navigationConfigSchema } from "@/config/schemas";
import {
  ConfigurationError,
  getNavigationConfig,
  listPageConfigs,
  parseYamlConfiguration,
} from "@/config/loader";
import { getContentDocument } from "@/lib/content";

describe("repository-managed configuration and content", () => {
  it("loads and validates navigation YAML", async () => {
    const navigation = await getNavigationConfig();
    expect(navigation.public.length).toBeGreaterThan(0);
    expect(navigation.dashboard.length).toBeGreaterThan(0);
  });

  it("loads public page YAML and referenced Markdown", async () => {
    const pages = await listPageConfigs();
    const home = pages.find((page) => page.route === "/");
    expect(home).toBeDefined();
    const markdown = home?.sections.find((section) => section.type === "markdown");
    expect(markdown?.type).toBe("markdown");
    if (!markdown || markdown.type !== "markdown") throw new Error("Home Markdown section is missing.");
    const document = await getContentDocument("pages", markdown.source.replace(/\.md$/, ""));
    expect(document.body.length).toBeGreaterThan(0);
  });

  it("reports the YAML filename and invalid field", () => {
    const invalid = `public:\n  - label: Missing destination\ndashboard: []\ndashboardFooter: []\n`;
    expect(() => parseYamlConfiguration("site-config/navigation.invalid.yml", invalid, navigationConfigSchema))
      .toThrowError(ConfigurationError);
    expect(() => parseYamlConfiguration("site-config/navigation.invalid.yml", invalid, navigationConfigSchema))
      .toThrow(/site-config\/navigation\.invalid\.yml:[\s\S]*public\.0\.href/);
  });
});
