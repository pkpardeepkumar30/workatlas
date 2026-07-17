# Windows quick start

## Normal workflow

For local build and manual testing:

```powershell
.\local-preview.cmd
```

Open `http://localhost:3000`, then press Ctrl+C when finished.

For a complete live release after local testing:

```powershell
.\release-production.cmd -Message "feat: describe the change" -Yes
```

The live-release command validates and builds locally, migrates Neon, commits all changes, pushes `main`, waits for the exact Vercel deployment, and verifies database health. See the README's one-time setup for `.env.release.local` before using it for the first time.

## First-time local setup

Install Node.js 22+, Git, and Docker Desktop. Then run from PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up -d db
npm ci --include=dev --include=optional
npm run db:migrate
npm run dev
```

Replace the placeholder `SESSION_SECRET` before starting. Keep `SESSION_COOKIE_SECURE=false` and `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local HTTP.

Open `http://localhost:3000`. Stop PostgreSQL with `docker compose stop db`.

To test a standard production build:

```powershell
npm run build
npm start
```

`docker compose down -v` permanently deletes the local database volume and all local WorkAtlas data. See `DEPLOYMENT_VERCEL_NEON.md` before deploying or resetting data.
