---
title: Getting started
description: Run PostgreSQL, create the schema and start the development server.
order: 1
published: true
---

## Local development

Copy `.env.example` to `.env`, start PostgreSQL, push the Drizzle schema and start Next.js.

```text
cp .env.example .env
docker compose up -d db
npm run db:push
npm run dev
```

Open `http://localhost:3000`, create an account and begin adding projects.

## Full Docker deployment

```text
docker compose up --build
```

The initial SQL migration in `drizzle/` is mounted into PostgreSQL and runs when the database volume is first created.
