---
title: AI integration
description: Configure the optional read-only project planner using the OpenAI Responses API.
order: 4
published: true
---

## Configuration

Add these values to `.env`:

```text
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5.6
```

Restart the application and open **Dashboard → AI planner**.

## Security boundary

The API key is used only by the server route. It is never included in browser JavaScript. The starter sends a concise portfolio summary and the user's planning request to the model.

The AI route is intentionally read-only. It can recommend actions, but it cannot execute SQL, modify projects or run shell commands. Add explicit, narrowly scoped server tools later if you want reviewed write operations.

## Cost

OpenAI API usage is billed separately from a ChatGPT subscription. Add rate limiting and per-user quotas before allowing a larger public user base to access this feature.
