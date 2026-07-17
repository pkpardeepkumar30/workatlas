# Deploy WorkAtlas with GitHub, Vercel, and Neon

This guide keeps WorkAtlas as one Next.js modular monolith. Vercel runs the application in the Node.js runtime, Neon stores production data, GitHub stores reviewed source, and Docker Compose remains the local PostgreSQL workflow.

## Architecture decisions

- Runtime queries use `drizzle-orm/node-postgres` with `pg` and Neon's pooled `DATABASE_URL`. The application reuses a small pool per warm serverless instance. This preserves transactions and the existing Drizzle query layer.
- Administrative migrations use the direct `DATABASE_URL_DIRECT` through `scripts/migrate.ts`. Application requests and Vercel builds never run migrations. The runner accepts committed, additive, forward-only SQL only.
- YAML and Markdown are committed, read-only production assets. Next.js output-file tracing explicitly includes `site-config` and `content`.
- Authentication uses opaque random cookies whose HMAC hashes and expiration timestamps are stored in PostgreSQL. Logout deletes the server-side session.
- Vercel uses the standard Next.js output. Standalone output is generated only by `npm run build:standalone` for Docker or self-hosting.

## Environment variables

| Variable | Required in production | Scope | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Server only | Neon pooled connection used by application requests |
| `DATABASE_URL_DIRECT` | No | Local operator environment only | Neon direct connection used only by operator migrations and backups; do not expose it to Vercel runtime functions |
| `SESSION_SECRET` | Yes | Server only | At least 32 characters; keys stored session-token hashes |
| `SESSION_COOKIE_SECURE` | Yes | Server only | Must be `true` on HTTPS production |
| `NEXT_PUBLIC_APP_NAME` | Yes | Public | Display/metadata name, normally `WorkAtlas` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public | Canonical HTTPS production URL |
| `REGISTRATION_ENABLED` | No | Server only | `true` for open registration; `false` for invite-only mode |
| `OPENAI_API_KEY` | No | Server only | Enables the AI planner |
| `OPENAI_MODEL` | No | Server only | Optional model override |
| `RESEND_API_KEY` | No | Server only | Resend credential for verification and password-reset delivery |
| `EMAIL_FROM` | No | Server only | Sender address on a verified email domain |
| `EMAIL_VERIFICATION_REQUIRED` | Yes | Server only | Keep `false` until email delivery is verified |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Public | Cloudflare Turnstile widget key |
| `TURNSTILE_SECRET_KEY` | No | Server only | Cloudflare Siteverify secret |
| `TURNSTILE_ENABLED` | Yes | Server only | Optional abuse protection; defaults to `false` |

Generate a production session secret without committing it:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Store the result directly in Vercel. Do not put it in Git, documentation, screenshots, or support messages. Changing it invalidates all active sessions.

## 1. Neon

1. Create a Neon project and choose an available European region close to the expected users and Vercel functions.
2. Create or select the production database and a least-privileged application role.
3. From Neon's connection details, copy both connection strings:
   - pooled URL → `DATABASE_URL`
   - direct URL → `DATABASE_URL_DIRECT`
4. Put the direct URL in ignored `.env.release.local` as described in the README, then use the guarded release workflow. For an initial empty database, apply committed migrations with:

   ```powershell
   node --env-file=.env.release.local --import tsx scripts/migrate.ts
   ```

5. Verify migration history in the Neon SQL editor:

   ```sql
   SELECT id, created_at
   FROM drizzle.__drizzle_migrations
   ORDER BY id;
   ```

   A current deployment should list every committed migration through `0005_aromatic_peter_parker`.
6. Verify that `users`, `sessions`, `projects`, `tasks`, `comments`, and `project_members` exist.

Production uses committed SQL migrations. `db:push` is intentionally unavailable. Vercel builds and GitHub Actions never migrate, reset, truncate, recreate or seed the database. Neon remains persistent when Vercel replaces application code.

Before release, `npm run db:migrations:verify` rejects `DROP`, `TRUNCATE`, live-table `DELETE`/seed statements, renames and destructive type conversions. The release script locally commits reviewed migrations before applying them to Neon; if migration fails, it does not push or deploy. Use one migration operator at a time.

### Backup before a risky migration

Safe additive migrations do not rewrite existing records. Before any risky data backfill, constraint, index, infrastructure or manually reviewed contract migration, create both a Neon restore point/branch when the plan supports it and a PostgreSQL dump:

```powershell
.\backup-production.cmd
```

This wrapper validates the direct Neon hostname, runs PostgreSQL 17 `pg_dump --format=custom --no-owner --no-acl` in Docker, and writes `backups/workatlas-neon-<UTC timestamp>.dump` plus a SHA-256 manifest. The directory is ignored by Git. Verify the file is non-empty, retain the printed hash, and copy both files to separate encrypted storage. A personal JSON/Excel export is useful for user portability but is not a substitute for a full PostgreSQL backup.

Automated migration remains blocked when destructive SQL is detected, even if a backup exists. Use an expand/migrate/contract sequence: add compatible schema, deploy compatible code, backfill in bounded reviewed batches, verify counts, and only then schedule the contract operation as a separate manual maintenance change.

### Rollback and recovery

Do not create down migrations that delete data. If application code fails after an additive migration, immediately use Vercel **Deployments → previous healthy deployment → Promote to Production**; additive schema remains backward compatible. Diagnose and ship a new forward migration.

For data recovery, restore into a new Neon branch/database first rather than overwriting the running production database:

```powershell
# Set this to the direct URL of a NEW empty recovery database.
$env:PGDATABASE = "<new recovery database direct URL>"
pg_restore --dbname=$env:PGDATABASE --clean --if-exists --no-owner --no-acl .\backups\workatlas-neon-YYYYMMDD-HHMMSS.dump
```

Validate migration history, table counts, several user/project/task/comment hierarchies, Kanban positions, authentication and `/api/health`. During a maintenance window, point Vercel's pooled `DATABASE_URL` and operator `DATABASE_URL_DIRECT` to the verified recovery database and redeploy. Keep the old database read-only until final verification. Never run `--clean` against the active production database.

### Preview databases

Do not give preview deployments an unrestricted production migration URL. Prefer a separate Neon branch/database per preview environment. If that is not available, omit write-capable production credentials from Preview and treat database-backed previews as intentionally unavailable.

## 2. GitHub

1. Confirm `.env`, `.next`, `node_modules`, dumps, logs, `data`, and `uploads` are not tracked.
2. Publish the private repository and push `main`.
3. Open the Actions tab and confirm the `CI` workflow passes.
4. Keep production credentials in Vercel/Neon, not GitHub Actions. CI uses non-routable placeholders and never connects to production.

For a repository that already has a GitHub remote:

```powershell
git remote -v
git push -u origin main
```

Never force-push deployment preparation over an existing remote.

## 3. Vercel

1. In Vercel, choose **Add New → Project** and import the private GitHub repository.
2. Confirm framework detection reports **Next.js**.
3. Use the defaults:
   - Install command: `npm ci` (or leave automatic)
   - Build command: `npm run build`
   - Output directory: leave automatic
4. Add these Production environment variables in Project Settings:

   ```text
   DATABASE_URL=<Neon pooled URL>
   SESSION_SECRET=<generated secret of at least 32 characters>
   SESSION_COOKIE_SECURE=true
   NEXT_PUBLIC_APP_NAME=WorkAtlas
   NEXT_PUBLIC_APP_URL=https://<vercel-production-domain>
   REGISTRATION_ENABLED=true
   OPENAI_API_KEY=<optional>
   OPENAI_MODEL=<optional>
   RESEND_API_KEY=<optional until email is configured>
   EMAIL_FROM=<optional until email is configured>
   EMAIL_VERIFICATION_REQUIRED=false
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=<optional>
   TURNSTILE_SECRET_KEY=<optional>
   TURNSTILE_ENABLED=false
   ```

5. Scope variables separately for Production, Preview, and Development. Use a separate Neon branch for Preview, or do not provide write-capable production credentials there.
6. Deploy. If the final production hostname differs from the initial hostname, update `NEXT_PUBLIC_APP_URL` and redeploy.
7. Environment changes do not alter an existing deployment; redeploy after every relevant change.
8. Verify `GET https://<domain>/api/health` returns `200` with `{"status":"ok","database":"connected"}`. Add this URL to UptimeRobot or another HTTPS uptime monitor.
9. Test registration/login/logout and an owner-scoped project/task workflow. With `REGISTRATION_ENABLED=false`, `/sign-up` must show the invite-only message and the API must return `403`.

Pushes to non-production branches create Vercel preview deployments. A push or merge to `main` creates the production deployment when the Vercel Git integration uses its default production-branch setting. GitHub CI and Vercel builds are separate checks; neither mutates the schema.

## 4. Local development with Docker Compose

```powershell
Copy-Item .env.example .env
# Replace SESSION_SECRET with a random value of at least 32 characters.
docker compose up -d db
npm ci --include=dev --include=optional
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Docker creates PostgreSQL storage only; the controlled migration runner creates and upgrades the schema while recording Drizzle history.

`DATABASE_URL_DIRECT` may remain empty locally; the migration runner falls back to `DATABASE_URL`.

### Existing legacy local volume

Older WorkAtlas versions mounted raw SQL into `/docker-entrypoint-initdb.d`, which could create tables without migration journal entries. Do not blindly rerun migrations if tables exist but `drizzle.__drizzle_migrations` is empty. Back up the database, verify its exact schema, baseline only the migrations already represented, and then run `npm run db:migrate`. The current maintained local database has already been brought under tracked migrations.

## 5. Local production and Docker/self-hosted builds

Standard production-style local test, matching Vercel's output mode:

```powershell
npm run build
npm start
```

Standalone self-hosted build:

```powershell
npm run build:standalone
npm run start:standalone
```

Full Docker workflow:

```powershell
docker compose up -d db
npm run db:migrate
docker compose up --build web
```

For a VPS, keep PostgreSQL private, terminate HTTPS at a trusted proxy, set `SESSION_COOKIE_SECURE=true`, provide all required environment variables, and run migrations as a deliberate operator step before starting the new application image.

### Custom domain later

In Vercel, open **Project Settings → Domains**, add the chosen domain, and apply the displayed DNS records. When HTTPS is ready, change `NEXT_PUBLIC_APP_URL`, update Turnstile hostname restrictions, and redeploy. Resend sending-domain DNS verification is a separate process and is still required before changing `EMAIL_FROM`.

## Operational limitations

- Export/import activity is audit logged per user. General administrative audit logging and automated expired-session cleanup are separate concerns; a scheduled cleanup job may be appropriate at larger scale.
- Uploads are not implemented. Vercel's filesystem is ephemeral; future uploads must use object storage through a dedicated abstraction.
- YAML and Markdown changes require a Git commit and redeployment; they are intentionally read-only at runtime.
- Run one migration operator at a time. Do not point simultaneous preview deployments at production migration credentials.
