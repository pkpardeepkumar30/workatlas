# WorkAtlas

WorkAtlas is a configuration-driven project and knowledge workspace for managing research, software development, publications, experiments, and long-term ideas. Authentication and live project data remain server-side, while curated pages can be extended without turning configuration into executable code.

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
- `content/pages/*.md` — public long-form copy referenced by `markdown` and `showcase` sections.
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

The registry is exhaustive at compile time, so adding a schema type without a renderer causes a TypeScript error. Current types are `hero`, `markdown`, `featureGrid`, `buttonGroup`, and `showcase`.

## Add a registered action

Add a named entry to `actionRegistry` in `src/registries/actions.ts`. Link actions contain a fixed internal `href`; form actions contain a fixed server endpoint and method. The Zod action enum is derived from this registry, so YAML can only refer to entries implemented in TypeScript.

Do not add a generic URL fetcher, expression evaluator, command runner, SQL action, or pass-through API action. If a new server mutation is needed, implement its authentication, authorization, input validation, and fixed endpoint in TypeScript, then register only that narrow operation.

## Add a dashboard widget

Dashboard YAML selects a registered widget and safe display options. To add a type, extend `dashboardWidgetSchema` and `dashboardWidgetRegistry`. Fetch live data in an owner-scoped server query and pass only the required result into the widget; never accept SQL or query fragments from configuration.

## Local development

### Daily two-command workflow (Windows)

Use these commands after changing the application:

```powershell
# 1. Build, validate, migrate the local database, and start the local production server
.\local-preview.cmd

# 2. Validate, commit everything, apply forward-only Neon migrations, push, and wait for Vercel
.\release-production.cmd -Message "feat: describe the change" -Yes
```

Open `http://localhost:3000` after the first command. Press Ctrl+C when manual local testing is finished. The script starts Docker PostgreSQL, installs dependencies only when `package-lock.json` changes, applies local migrations, validates configuration, runs type checking, linting and tests, builds the application, verifies its assets, and starts that production build. It uses a localhost-only preview flag so authentication works over local HTTP; this exception cannot enable insecure cookies for a public URL.

The release command stops immediately if checks fail, the current branch is not `main`, GitHub contains commits that are missing locally, a secret-like file is staged, or a Neon credential is detected in staged content. It commits all source and forward-only migration files locally, applies those committed migrations through Neon's direct connection, pushes `main`, waits for the matching release fingerprint at `/api/version`, and finally checks `/api/health`. If migration fails, nothing is pushed or deployed. Vercel's existing GitHub integration performs the deployment.

`-Yes` makes the release fully unattended. Omit it if you prefer a final `RELEASE` confirmation before Neon or GitHub is changed. You can safely exercise the checks without migrating, committing, pushing, or deploying:

```powershell
.\local-preview.cmd -ChecksOnly
.\release-production.cmd -DryRun
```

The equivalent npm aliases are `npm.cmd run local:preview` and `npm.cmd run release:production -- ...`. The top-level `.cmd` launchers are recommended on Windows because they also work when `npm` is not on the current PowerShell PATH.

### One-time setup for the release command

Create the private production release file once:

```powershell
Copy-Item .env.release.example .env.release.local
notepad .env.release.local
```

Put the Neon **direct** connection string in `DATABASE_URL_DIRECT` (its hostname must not contain `-pooler`), change its query parameter to `sslmode=verify-full`, and keep `NEXT_PUBLIC_APP_URL=https://workatlas-kappa.vercel.app`. The private file is ignored by Git, is not automatically loaded by Next.js, and must never be committed or shared. It is loaded explicitly only for migrations and deployment verification; the runtime variables remain in Vercel.

The local `.env`, Docker Desktop, Git authentication, and the Vercel GitHub import are also one-time prerequisites. If they are already working, no additional setup is needed.

### Manual commands

```text
Copy-Item .env.example .env
docker compose up -d db
npm ci --include=dev --include=optional
npm run db:migrate
npm run dev
```

The schema includes users, revocable sessions, projects, tasks, comments, per-project membership permissions, single-use account-security tokens, and persistent rate limits. Docker creates PostgreSQL; committed Drizzle migrations create and upgrade its schema.

Public registration remains available when `REGISTRATION_ENABLED=true`. Every newly created account must verify its address before dashboard access; pre-existing accounts are deliberately grandfathered by the additive migration. Turnstile remains an optional abuse-control layer.

## Project and task management

Projects can be edited or deleted from the portfolio and project detail views. Project edits cover title, description, area, status, priority, deadline, and next action. The delete confirmation names the project and warns that PostgreSQL cascade rules also remove its tasks and comments.

Tasks can be created globally, directly from a project, or from any Kanban column. A column-scoped action preselects its status while retaining the project selector. Task creation and editing support a precise deadline plus one-time email reminders at 15 minutes, 1 hour, 1 day, 2 days, 1 week, or a custom time. The responsive editor is a bottom drawer on small screens and a centered dialog on larger screens. Task reassignment succeeds only when the destination project belongs to the authenticated owner.

Project/task Add, Edit, and Delete operations appear inside compact three-line action menus. Destructive actions still open named confirmation dialogs. Successful mutations show only a small green check for about two seconds; errors remain visible until the user can act on them.

Project pages show total, open, and completed task counts and support sorting by priority, due date, status, or creation date. The shared priority registry maps stored `critical` values to the visible label **Urgent** and supplies the same text-and-colour treatment to lists, forms, dashboard widgets, reviews, and Kanban cards.

All mutations flow through authenticated server actions and the owner-scoped mutation service. Client code receives no generic database endpoint or arbitrary query capability.

## Kanban ordering

The Kanban board uses `dnd-kit` sensors for mouse, touch, and keyboard interaction. Drag the dedicated handle, or focus it and press Space to start a keyboard move. Moving a task updates both its status and zero-based position.

The UI applies changes optimistically. The server validates every task ID, verifies ownership, and saves the complete order in one Drizzle transaction. If validation or persistence fails, the client restores its previous state and shows an error.

Migration `0002_mute_hedge_knight.sql` adds `tasks.position`, backfills deterministic positions within each owner/status column, and adds the ordering index. Apply pending migrations before deploying the updated application:

```text
npm run db:migrate
```

Production migrations use `DATABASE_URL_DIRECT`; runtime queries use the pooled `DATABASE_URL`. Never use `db:push` against production or run migrations during Vercel builds. Create and verify a PostgreSQL backup before any risky migration or backfill.

Migration `0004_mature_redwing.sql` adds `users.email_verified_at`, email-verification tokens, password-reset tokens, and atomic PostgreSQL rate-limit counters.

## Persistent production data and migration safety

Neon PostgreSQL is the persistent source of truth. Deployments replace application code only; they do not recreate, truncate, reset or seed production tables. Users, sessions, projects, tasks, Kanban positions, comments and relationships remain in Neon across Vercel deployments.

Every schema change must be generated as reviewed SQL with `npm run db:generate`, committed under `drizzle/`, and applied with `npm run db:migrate`. The migration runner and `npm run db:migrations:verify` reject destructive SQL such as `DROP`, `TRUNCATE`, live-data `DELETE`/seed statements, renames and destructive type conversions. `db:push` is intentionally not provided.

Safe additive migrations run through the release workflow. Risky changes require an expand/migrate/contract design and a verified backup first:

```powershell
.\backup-production.cmd
```

The command runs PostgreSQL `pg_dump` in Docker, creates a compressed custom-format dump and SHA-256 manifest under ignored `backups/`, and never writes credentials into Git. Copy the result to separate encrypted storage. Automated release remains blocked for destructive SQL; review and execute any contract step manually only after old application code no longer depends on it. Recovery and `pg_restore` instructions are in `DEPLOYMENT_VERCEL_NEON.md`.

Migration `0005_aromatic_peter_parker.sql` adds only the data-transfer audit table and empty tag arrays to existing projects/tasks; it does not replace or rewrite live rows.

Migration `0006_curved_namor.sql` adds nullable task deadline/reminder columns, a deduplication log, and an `email_verification_required` account flag defaulting to `false`. It contains no updates, deletes, resets, seeds, or table replacements, so existing accounts, projects, tasks, comments, sessions, and Kanban positions remain unchanged.

## Personal export and import

Authenticated users can open **Dashboard → Export / import**. JSON version 1.0 is canonical; YAML and Excel use the same internal Zod schema. Exports contain only the signed-in user's projects, tasks, authored comments, project-task relationships, IDs, descriptions, dates, statuses, priorities, positions, tags and timestamps. Password hashes, sessions, tokens, permissions, API keys, rate limits and security records are never selected or serialized.

Imports enforce 5 MB, 1,000-project, 10,000-task and 20,000-comment limits. Files are parsed and strictly validated before the preview appears. The user then chooses **create new**, **skip existing**, or **update matching IDs**. Every owner/author ID is supplied server-side from the authenticated session, and the complete hierarchy plus success audit entry is written in one PostgreSQL transaction. Any write failure rolls back the entire import. Failed attempts are also audit logged without retaining file contents.

## Account security and email

New security features use these environment variables:

```text
RESEND_API_KEY=
BREVO_API_KEY=
EMAIL_PROVIDER=brevo
EMAIL_FROM=
CRON_SECRET=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ENABLED=false
```

Verification and reset tokens come from cryptographically secure random bytes; only HMAC hashes are stored. Tokens are single-use and expire, and a successful password reset deletes every session belonging to that user. Forgot-password and resend-verification responses do not disclose whether an arbitrary address exists.

Account email addresses are currently immutable: there is no client or server endpoint that can change an authenticated user's email. A future email-change workflow must require current-account proof and verification of the replacement address before committing the change.

Brevo is the default provider. Choose it explicitly with `EMAIL_PROVIDER=brevo`, or switch to the optional Resend integration with `EMAIL_PROVIDER=resend`. Brevo uses `BREVO_API_KEY`; Resend uses `RESEND_API_KEY`; both require `EMAIL_FROM` in `Name <address@example.com>` format. Resend's `onboarding@resend.dev` testing sender can deliver only to the Resend account address. Brevo can use a verified individual sender for free multi-recipient testing, although an authenticated custom domain remains recommended for deliverability.

Configure and test delivery before opening registration. New registration now creates its session only after the first verification message is accepted. If token creation or initial delivery fails, the newly inserted pending account is removed with its dependent token, preventing a partially-created account. Existing users remain able to sign in. Verification is a per-account database policy and cannot be disabled for newly created accounts with a client request or YAML setting.

### Deadline reminder scheduler

The authenticated `GET /api/cron/reminders` worker processes at most 100 due reminders per call. It first inserts a unique `(task_id, reminder_at)` claim, then sends; simultaneous invocations therefore skip the same reminder. Completed tasks, elapsed deadlines, accounts still pending required verification, and other users' data are excluded. Existing grandfathered accounts remain eligible. Delivery logs contain only status and controlled failure codes.

For the existing Vercel Hobby deployment, use a free HTTPS scheduler such as cron-job.org because Hobby cron cannot provide the frequency needed for a 15-minute reminder. Configure it once:

1. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Add that exact value to Vercel **Project Settings → Environment Variables** as `CRON_SECRET` for Production, then redeploy.
3. In cron-job.org, create a `GET` job for `https://workatlas-kappa.vercel.app/api/cron/reminders`, scheduled every five minutes.
4. Add the custom request header `Authorization: Bearer <the same CRON_SECRET>` and use its test-run control once. A successful run returns JSON counts without exposing addresses or database credentials.

The scheduler has no database credentials and can call only the fixed authenticated endpoint. Rotate `CRON_SECRET` in Vercel and the scheduler if it is ever disclosed. If moving to a Vercel plan that supports frequent cron schedules, the same endpoint and bearer-secret contract can be used from `vercel.json` instead.

### Privacy and encryption boundaries

Production web traffic uses HTTPS, secure cookies, HSTS, clickjacking/content-sniffing protections, and restrictive referrer/permissions headers. Remote PostgreSQL URLs are normalized to `sslmode=verify-full`, verifying both the certificate authority and Neon hostname. Neon supplies managed AES-256 encryption at rest; WorkAtlas does not commit encryption keys or database credentials.

Passwords use bcrypt with cost 12. Session, verification, reset, rate-limit, and scheduler secrets are stored as hashes or outside the repository as appropriate. Every project/task query and mutation takes the authenticated owner ID server-side; the client has no generic database endpoint. Do not print request bodies, email provider credentials, database URLs, session tokens, or raw delivery errors in logs.

Turnstile is optional and every token is validated server-side. For local testing only, Cloudflare provides the always-pass site key `1x00000000000000000000AA` and secret key `1x0000000000000000000000000000000AA`. Never use test keys in production. Registration and forgot-password require Turnstile whenever it is enabled; sign-in requires it after repeated failures.

Rate-limit identifiers such as email addresses and IP addresses are HMAC-hashed before storage. Fixed-window counters use atomic PostgreSQL upserts, making them suitable for Vercel's ephemeral serverless functions.

## Health monitoring

`GET /api/health` performs a lightweight database query and returns only connection state. Configure UptimeRobot or an equivalent HTTPS monitor to request `https://your-domain.example/api/health` every five minutes and alert on a non-200 response.

`GET /api/version` returns the non-secret release fingerprint written by the production release script. The script uses this endpoint to distinguish the new Vercel deployment from the previously cached deployment.

## Custom domain readiness

No production URL is hard-coded. `NEXT_PUBLIC_APP_URL` supplies metadata and all email links. To add a domain later:

1. In Vercel, open **Project → Settings → Domains**, add the domain, and follow Vercel's DNS instructions.
2. Change `NEXT_PUBLIC_APP_URL` to the final `https://` URL in Production.
3. Redeploy so metadata and future email links use the new origin.
4. Update Turnstile hostname restrictions if Turnstile is enabled.
5. Verify the email-sending domain separately in Resend; a Vercel domain assignment does not verify email delivery.

Recommended Vercel project description: “WorkAtlas is a project and knowledge workspace for research, software, publications, experiments, and long-term ideas.”

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
npm run db:migrations:verify
npm run build
npm run build:verify
```

Or run the complete sequence with `npm run check`. Tests cover mutations, permissions/data isolation, configuration, Markdown loading, environment validation, email verification policy, reminder validation/deduplication, task reassignment, Kanban creation/persistence, action menus, compact success feedback, export/import mapping, and migration preservation. Invalid YAML produces errors such as:

```text
Invalid configuration in site-config/pages/home.yml:
- sections.1.buttons.0.action: Invalid option
```

See `BUILD_LOCAL.md`, `QUICK_START_WINDOWS.md`, and `DEPLOYMENT.md` for platform-specific build and deployment notes.
