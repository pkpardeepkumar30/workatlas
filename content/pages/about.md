---
title: About WorkAtlas
description: How WorkAtlas separates configuration, content, reusable code, and live records.
order: 2
published: true
---

## A workspace with deliberate boundaries

WorkAtlas treats configuration, editorial content, reusable code, and live records as different kinds of information:

- **YAML** chooses approved navigation items, feature flags, page sections, buttons, and dashboard widgets.
- **Markdown** contains long-form public copy and documentation.
- **TypeScript registries** decide which components and actions YAML is allowed to reference.
- **PostgreSQL and Drizzle** own users, sessions, projects, tasks, comments, permissions, verification tokens, and other concurrent data.

YAML is parsed as data and validated before rendering. It is never evaluated as JavaScript and cannot contain SQL, shell commands, or arbitrary API calls.
