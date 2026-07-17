---
title: About this starter
description: The boundaries used by the configuration-driven architecture.
order: 2
published: true
---

## Four deliberate boundaries

The application treats configuration, editorial content, reusable code, and live records as different kinds of information:

- **YAML** chooses approved navigation items, feature flags, page sections, buttons, and dashboard widgets.
- **Markdown** contains long-form public copy and documentation.
- **TypeScript registries** decide which components and actions YAML is allowed to reference.
- **PostgreSQL and Drizzle** own users, projects, tasks, comments, permissions, and other concurrent data.

YAML is parsed as data and validated before rendering. It is never evaluated as JavaScript and cannot contain SQL, shell commands, or arbitrary API calls.
