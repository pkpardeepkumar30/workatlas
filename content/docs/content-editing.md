---
title: Editing content with Markdown
description: Add public copy and documentation while keeping layout in validated YAML.
order: 2
published: true
---

## File locations

Public long-form content lives in `content/pages`. Documentation lives in `content/docs`. Page routes and section order live separately in `site-config/pages`.

Every Markdown document starts with validated front matter:

```text
---
title: My page
description: A concise summary.
order: 3
published: true
---
```

To add a public page, create `content/pages/my-page.md`, then create a matching page layout such as `site-config/pages/my-page.yml`. The layout references the content with a registered section:

```yaml
- type: markdown
  source: my-page.md
```

To add a documentation page, create `content/docs/my-page.md`. It appears automatically at `/docs` and renders at `/docs/my-page`.

## What should remain in PostgreSQL

Accounts, projects, tasks, comments, permissions, deadlines and audit events belong in the database. These records are frequently changed by multiple users and require validation, relationships and authorization.

## What configuration cannot do

Configuration may select only registered UI and actions. It cannot contain JavaScript, SQL, shell commands, component imports, or unrestricted API calls. Add behavior in TypeScript with explicit authentication and validation, then expose only its narrow registered name to YAML.
