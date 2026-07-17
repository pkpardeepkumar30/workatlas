---
title: Architecture
description: Understand the configuration, content, registry, and live-data boundaries.
order: 3
published: true
---

## Current architecture

The Next.js server renders public and authenticated pages. PostgreSQL stores users, projects, tasks, comments, and project permissions. Authentication uses password hashing and a signed HTTP-only session cookie. Every project and task query remains owner-scoped on the server.

Presentation is split into four deliberate layers:

1. Files in `site-config` describe branding, navigation, feature visibility, public-page layouts, buttons, and dashboard widgets.
2. Files in `content` contain editorial Markdown and documentation.
3. TypeScript registries contain the only UI sections, icons, widgets, and actions that configuration may select.
4. Drizzle and PostgreSQL contain concurrent, relational application data.

All YAML schemas are strict. A configuration file cannot import a component, execute code, provide SQL, run a command, or call an arbitrary API.

## Request flow

A configured public route is matched by the generic Next.js catch-all page. The server loads and validates the matching page YAML, removes sections disabled by feature configuration, and dispatches each remaining section through the controlled registry. A `markdown` section may read only a validated filename from `content/pages`.

The authenticated dashboard follows the same presentation pattern for widgets, but widget components only receive data returned by existing owner-scoped Drizzle queries. Widget YAML cannot construct a query.

## Scaling path

1. Run the application and PostgreSQL on one desktop for a small trusted group.
2. Move the same Docker Compose deployment to a VPS.
3. Move uploads to S3-compatible object storage.
4. Move PostgreSQL to a managed service when operational reliability matters.
5. Add a background worker only when scheduled AI reviews or notifications require it.

Avoid introducing microservices, Redis or Kubernetes before actual load demonstrates a need.

