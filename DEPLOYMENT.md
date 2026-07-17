# Deployment options

- For GitHub + Vercel + Neon, follow `DEPLOYMENT_VERCEL_NEON.md`.
- For local development and production-style testing, follow `BUILD_LOCAL.md`.
- For Docker/VPS self-hosting, use the standalone build documented in both guides.

In every production mode:

- keep PostgreSQL private;
- terminate HTTPS before the application;
- set `SESSION_COOKIE_SECURE=true`;
- store secrets outside Git;
- use committed migrations through `npm run db:migrate`;
- verify them with `npm run db:migrations:verify`; destructive SQL is blocked from automation;
- back up PostgreSQL before schema or infrastructure changes;
- use object storage for any future uploads.
