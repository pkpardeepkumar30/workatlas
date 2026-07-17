# Build and run WorkAtlas locally

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop with Docker Compose, or a separately managed PostgreSQL server

## Development mode

```powershell
Copy-Item .env.example .env
# Edit .env and replace SESSION_SECRET with at least 32 random characters.
docker compose up -d db
npm ci --include=dev --include=optional
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. `DATABASE_URL_DIRECT` may remain empty locally; migrations then use `DATABASE_URL`.

Use `npm run db:generate` after changing `src/db/schema.ts`, review the generated SQL, and commit the migration. `npm run db:push` is available only for disposable local prototyping; normal local and all production workflows use committed migrations.

## Production-style local test

```powershell
npm run build
npm start
```

This uses standard Next.js output, matching Vercel. `npm start` loads `.env` when present.

## Docker/standalone build

```powershell
npm run build:standalone
npm run start:standalone
```

Or build the web container:

```powershell
docker compose up -d db
npm run db:migrate
docker compose up --build web
```

## Validation

```powershell
npm run config:validate
npm run typecheck
npm run lint
npm test
npm run db:check
npm run build
npm run build:verify
```

The AI planner is optional. Add `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to `.env`; API usage is billed separately.

See `DEPLOYMENT_VERCEL_NEON.md` for GitHub, Vercel, Neon, previews, backups, and production operations.
