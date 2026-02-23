# leet-review

A personal spaced repetition app for reviewing LeetCode problems before coding interviews. Add problems, let [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) schedule your reviews, and rate your recall each day.

## Scripts

```bash
# Development
bun dev              # start dev server on :3000
bun run build        # production build
bun run preview      # preview production build locally
bun run deploy       # build + wrangler deploy

# Auth
bun run auth:generate   # generate Better Auth schema → src/db/auth.schema.ts
bun run auth:migrate    # run Better Auth migrations via CLI

# Database (Drizzle + D1)
bun run db:generate  # generate SQL migrations from schema
bun run db:migrate   # apply migrations to local D1 via wrangler
bun run db:migrate:remote # apply migrations to remote D1 via wrangler
bun run db:push      # push schema directly (dev only)
bun run db:pull      # pull schema from DB
bun run db:studio    # open Drizzle Studio

# Cloudflare
bun run cf:types     # regenerate worker-configuration.d.ts from wrangler.jsonc

# Code quality
bun run lint         # biome lint
bun run format       # biome format
bun run check        # biome check (lint + format)
bun run test         # vitest run
```
