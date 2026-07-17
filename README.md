# WorkAtlas

A configuration-driven, self-hosted Next.js project-management starter. Authentication and live project data remain server-side, while curated pages can be extended without turning configuration into executable code.

## Architecture boundaries

| Concern | Source of truth | Examples |
| --- | --- | --- |
| Branding and presentation | `site-config/*.yml` | Site identity, navigation, feature flags, page layouts, buttons, dashboard widgets |
| Editorial content | `content/**/*.md` | Public copy, documentation, guides |
| Live multi-user data | PostgreSQL through Drizzle | Users, projects, tasks, comments, memberships and permissions |
| Allowed behavior and UI | TypeScript registries in `src/registries` | Section components, widget components, icons and named actions |

YAML is parsed as data with `yaml` and validated by strict Zod schemas in `src/config/schemas.ts`. Unknown fields and invalid values fail with the configuration filename and field path. YAML is never evaluated and cannot contain JavaScript, SQL, shell commands, arbitrary request URLs, or arbitrary component imports.

## Configuration files

- `site-config/site.yml` — name, description, locale, and controlled branding values.
- `site-config/navigation.yml` — public and authenticated navigation.
- `site-config/features.yml` — public and dashboard feature visibility.
- `site-config/dashboard.yml` — dashboard heading and registered widgets. Widgets only receive already owner-scoped query results.
- `site-config/pages/*.yml` — route metadata and ordered registered sections.
- `content/pages/*.md` — public long-form copy referenced by `markdown` sections.
- `content/docs/*.md` — documentation and its validated front matter.

## Add a public page

1. Add `content/pages/my-page.md` with the normal front matter and Markdown body.
2. Add `site-config/pages/my-page.yml`:

   ```yaml
   route: /my-page
   title: My page
   description: A short metadata description.
   published: true
   sections:
     - type: hero
       title: My page
       layout: centered
     - type: markdown
       source: my-page.md
   ```

3. Run `npm run config:validate`. The catch-all public route renders the page automatically; no new Next.js route is required.

Routes must be internal public paths. `/api`, `/dashboard`, framework routes, external URLs, and protocol URLs are rejected by the page schema.

## Add a button

Buttons invoke a registered action ID, never a URL or code from YAML:

```yaml
- type: buttonGroup
  alignment: left
  buttons:
    - label: Read documentation
      action: readDocs
      variant: primary
```

Allowed variants are `primary`, `secondary`, `dark`, and `text`.

## Add a navigation item

Add an item to the relevant list in `site-config/navigation.yml`. A navigation item accepts either a safe internal `href` or a registered `action`, but never both:

```yaml
- label: My page
  href: /my-page
  feature: publicPages
```

Optional `visibility` values are `all`, `guest`, and `authenticated`. Dashboard items can use a registered icon name. Feature flags hide matching navigation, page sections, and dashboard widgets; authorization still belongs in server-side auth/query code.

## Add a section type

1. Define a strict Zod object with a literal `type` in `src/config/schemas.ts` and add it to `pageSectionSchema`.
2. Implement a renderer in `src/registries/sections.tsx`.
3. Add the renderer under the same key in `sectionRegistry`.
4. Add an example to a page YAML file and run the checks.

The registry is exhaustive at compile time, so adding a schema type without a renderer causes a TypeScript error. Current types are `hero`, `markdown`, `featureGrid`, and `buttonGroup`.

## Add a registered action

Add a named entry to `actionRegistry` in `src/registries/actions.ts`. Link actions contain a fixed internal `href`; form actions contain a fixed server endpoint and method. The Zod action enum is derived from this registry, so YAML can only refer to entries implemented in TypeScript.

Do not add a generic URL fetcher, expression evaluator, command runner, SQL action, or pass-through API action. If a new server mutation is needed, implement its authentication, authorization, input validation, and fixed endpoint in TypeScript, then register only that narrow operation.

## Add a dashboard widget

Dashboard YAML selects a registered widget and safe display options. To add a type, extend `dashboardWidgetSchema` and `dashboardWidgetRegistry`. Fetch live data in an owner-scoped server query and pass only the required result into the widget; never accept SQL or query fragments from configuration.

## Local development

```text
Copy-Item .env.example .env
docker compose up -d db
npm ci --include=dev --include=optional
npm run db:migrate
npm run dev
```

The schema includes users, revocable sessions, projects, tasks, comments, and per-project membership permissions. Docker creates PostgreSQL; committed Drizzle migrations create and upgrade its schema.

## Project and task management

Projects can be edited or deleted from the portfolio and project detail views. Project edits cover title, description, area, status, priority, deadline, and next action. The delete confirmation names the project and warns that PostgreSQL cascade rules also remove its tasks and comments.

Tasks can be edited or deleted anywhere they are managed, including the dashboard, task list, project detail, and Kanban board. The responsive editor is a bottom drawer on small screens and a centered dialog on larger screens. Task reassignment succeeds only when the destination project belongs to the authenticated owner.

All mutations flow through authenticated server actions and the owner-scoped mutation service. Client code receives no generic database endpoint or arbitrary query capability.

## Kanban ordering

The Kanban board uses `dnd-kit` sensors for mouse, touch, and keyboard interaction. Drag the dedicated handle, or focus it and press Space to start a keyboard move. Moving a task updates both its status and zero-based position.

The UI applies changes optimistically. The server validates every task ID, verifies ownership, and saves the complete order in one Drizzle transaction. If validation or persistence fails, the client restores its previous state and shows an error.

Migration `0002_mute_hedge_knight.sql` adds `tasks.position`, backfills deterministic positions within each owner/status column, and adds the ordering index. Apply pending migrations before deploying the updated application:

```text
npm run db:migrate
```

Production migrations use `DATABASE_URL_DIRECT`; runtime queries use the pooled `DATABASE_URL`. Never use `db:push` against production or run migrations during Vercel builds. Back up production data before applying migrations.

## Deployment

The supported hosted architecture is GitHub → Vercel with Neon PostgreSQL. Vercel uses standard Next.js output and Node.js functions. Docker/self-hosting uses the explicit standalone build.

See [DEPLOYMENT_VERCEL_NEON.md](DEPLOYMENT_VERCEL_NEON.md) for environment variables, Neon migration and backup procedures, GitHub publication, Vercel Production/Preview configuration, and operational limitations.

## Validation and release checks

```text
npm run config:validate
npm run typecheck
npm run lint
npm run test
npm run db:check
npm run build
npm run build:verify
```

Or run the complete sequence with `npm run check`. Tests cover mutations, permissions, configuration, Markdown loading, environment validation, task reassignment, and Kanban persistence. Invalid YAML produces errors such as:

```text
Invalid configuration in site-config/pages/home.yml:
- sections.1.buttons.0.action: Invalid option
```

See `BUILD_LOCAL.md`, `QUICK_START_WINDOWS.md`, and `DEPLOYMENT.md` for platform-specific build and deployment notes.
