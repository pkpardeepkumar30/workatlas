# Windows quick start

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
