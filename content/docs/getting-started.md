---
title: Getting started
description: Run PostgreSQL, create the schema and start the development server.
order: 1
published: true
---

## Local development

Copy `.env.example` to `.env`, start PostgreSQL, apply the committed Drizzle migrations, and start Next.js.

```text
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`, create an account and begin adding projects.

## Full Docker deployment

```text
docker compose up --build
```

Docker provides PostgreSQL storage. Run `npm run db:migrate` deliberately to apply and journal every committed migration. Do not use `db:push` for production.
