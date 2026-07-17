import { z } from "zod";
import { actionIds } from "@/registries/actions";
import { iconNames } from "@/registries/icons";

const actionIdSchema = z.enum(actionIds);
const iconNameSchema = z.enum(iconNames);
const internalHrefSchema = z
  .string()
  .regex(/^\/(?!\/)/, "must be an absolute internal path beginning with one slash")
  .refine((href) => !href.startsWith("/api/") && !href.startsWith("/_next/"), {
    message: "must not target API or framework routes",
  });

export const featureIdSchema = z.enum([
  "publicPages",
  "docs",
  "dashboard.projects",
  "dashboard.ideas",
  "dashboard.tasks",
  "dashboard.kanban",
  "dashboard.review",
  "dashboard.aiPlanner",
]);

export type FeatureId = z.infer<typeof featureIdSchema>;

export const buttonSchema = z
  .object({
    label: z.string().min(1),
    action: actionIdSchema,
    variant: z.enum(["primary", "secondary", "dark", "text"]).default("primary"),
  })
  .strict();

const heroSectionSchema = z
  .object({
    type: z.literal("hero"),
    id: z.string().min(1).optional(),
    eyebrow: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    layout: z.enum(["split", "centered"]).default("centered"),
    callout: z
      .object({
        title: z.string().min(1),
        badge: z.string().min(1).optional(),
        items: z.array(z.string().min(1)).min(1).max(6),
      })
      .strict()
      .optional(),
    feature: featureIdSchema.optional(),
  })
  .strict();

const markdownSectionSchema = z
  .object({
    type: z.literal("markdown"),
    id: z.string().min(1).optional(),
    source: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/, "must be a .md filename in content/pages"),
    feature: featureIdSchema.optional(),
  })
  .strict();

const featureGridSectionSchema = z
  .object({
    type: z.literal("featureGrid"),
    id: z.string().min(1).optional(),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
    items: z
      .array(
        z
          .object({
            title: z.string().min(1),
            description: z.string().min(1),
            icon: iconNameSchema,
          })
          .strict(),
      )
      .min(1),
    feature: featureIdSchema.optional(),
  })
  .strict();

const buttonGroupSectionSchema = z
  .object({
    type: z.literal("buttonGroup"),
    id: z.string().min(1).optional(),
    alignment: z.enum(["left", "center", "right"]).default("left"),
    buttons: z.array(buttonSchema).min(1).max(5),
    feature: featureIdSchema.optional(),
  })
  .strict();

export const pageSectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  markdownSectionSchema,
  featureGridSectionSchema,
  buttonGroupSectionSchema,
]);

export const pageConfigSchema = z
  .object({
    route: internalHrefSchema.refine((route) => !route.startsWith("/dashboard") && !route.startsWith("/api"), {
      message: "must be a public route",
    }),
    title: z.string().min(1),
    description: z.string().min(1),
    published: z.boolean().default(true),
    sections: z.array(pageSectionSchema).min(1),
  })
  .strict();

const navigationItemSchema = z
  .object({
    label: z.string().min(1),
    href: internalHrefSchema.optional(),
    action: actionIdSchema.optional(),
    icon: iconNameSchema.optional(),
    feature: featureIdSchema.optional(),
    visibility: z.enum(["all", "guest", "authenticated"]).default("all"),
    variant: z.enum(["default", "primary"]).default("default"),
  })
  .strict()
  .superRefine((item, context) => {
    if ((item.href ? 1 : 0) + (item.action ? 1 : 0) !== 1) {
      context.addIssue({
        code: "custom",
        path: ["href"],
        message: "provide exactly one of href or action",
      });
    }
  });

export const navigationConfigSchema = z
  .object({
    public: z.array(navigationItemSchema),
    dashboard: z.array(navigationItemSchema),
    dashboardFooter: z.array(navigationItemSchema).default([]),
  })
  .strict();

export const featuresConfigSchema = z
  .object({
    publicPages: z.boolean(),
    docs: z.boolean(),
    dashboard: z
      .object({
        projects: z.boolean(),
        ideas: z.boolean(),
        tasks: z.boolean(),
        kanban: z.boolean(),
        review: z.boolean(),
        aiPlanner: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const siteConfigSchema = z
  .object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    description: z.string().min(1),
    tagline: z.string().min(1),
    locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "must be a locale such as en or en-US"),
    branding: z
      .object({
        logoIcon: iconNameSchema,
        accent: z.enum(["indigo"]),
      })
      .strict(),
  })
  .strict();

const metricKeySchema = z.enum(["activeProjects", "ideas", "openTasks", "overdueTasks"]);

const metricGridWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("metricGrid"),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4),
    feature: featureIdSchema.optional(),
    metrics: z
      .array(
        z.object({ label: z.string().min(1), value: metricKeySchema, icon: iconNameSchema }).strict(),
      )
      .min(1),
  })
  .strict();

const projectListWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("projectList"),
    title: z.string().min(1),
    limit: z.number().int().min(1).max(20).default(5),
    feature: featureIdSchema.optional(),
  })
  .strict();

const taskListWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("taskList"),
    title: z.string().min(1),
    limit: z.number().int().min(1).max(20).default(6),
    feature: featureIdSchema.optional(),
  })
  .strict();

export const dashboardWidgetSchema = z.discriminatedUnion("type", [
  metricGridWidgetSchema,
  projectListWidgetSchema,
  taskListWidgetSchema,
]);

export const dashboardConfigSchema = z
  .object({
    heading: z
      .object({
        eyebrow: z.string().min(1),
        welcomePrefix: z.string().min(1),
        description: z.string().min(1),
        button: buttonSchema,
      })
      .strict(),
    widgets: z.array(dashboardWidgetSchema).min(1),
  })
  .strict()
  .superRefine((config, context) => {
    const ids = new Set<string>();
    config.widgets.forEach((widget, index) => {
      if (ids.has(widget.id)) {
        context.addIssue({ code: "custom", path: ["widgets", index, "id"], message: "widget id must be unique" });
      }
      ids.add(widget.id);
    });
  });

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type NavigationConfig = z.infer<typeof navigationConfigSchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type PageConfig = z.infer<typeof pageConfigSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
export type ButtonConfig = z.infer<typeof buttonSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;

