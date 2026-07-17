---
title: WorkAtlas
description: A self-hosted project and idea management starter.
order: 1
published: true
---

## Content that does not require a developer

This section comes directly from `content/pages/home.md`. Change this text, save the file, and reload the website. The public marketing pages and documentation remain independent from transactional application data.

### Design principle

- Markdown is used for public copy, documentation, guides and reusable project templates.
- PostgreSQL is used for accounts, projects, tasks, status changes and future collaboration data.
- Server-side permission checks isolate every user's records.
- The codebase remains a modular monolith that can run on one desktop or move to a VPS.

> Do not use Markdown files as a concurrent multi-user database. They are excellent for curated content, but not for live task state.
