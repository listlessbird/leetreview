# leet-review

a personal spaced repetition app for reviewing lc problems. Add problems, let [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) schedule your reviews, and rate your recall each day.

## Scripts

```bash
# Development
bun dev              # start dev server on :3000
bun run build        # production build
bun run preview      # build + start the production server locally

# Auth
bun run auth:generate   # generate Better Auth schema → src/db/auth.schema.ts
bun run auth:migrate    # run Better Auth migrations via CLI

# Database
bun run db:generate  # generate SQL migrations from schema
bun run db:migrate   # apply generated migrations to the active database target
bun run db:push      # push schema directly to the active database target
bun run db:pull      # pull schema from the active database target
bun run db:studio    # open Drizzle Studio

# LeetCode search cache
bun run leetcode:cache # write a local search index to ./data/leetcode-cache.json

# Code quality
bun run lint         # biome lint
bun run format       # biome format
bun run check        # biome check (lint + format)
bun run test         # vitest run
```

## Environment

Set these server variables for app runtime:

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
LOCAL_SQLITE_PATH=data/dev.sqlite
```

Optional:

```bash
DATABASE_MODE=local
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_DATABASE_ID=...
CLOUDFLARE_D1_TOKEN=...
LEETCODE_CACHE_PATH=data/leetcode-cache.json
```

Database mode defaults to local SQLite in development. To point the app and Drizzle Kit at Cloudflare D1 over the HTTP API, set `DATABASE_MODE=d1-http` together with the three `CLOUDFLARE_*` variables above.

Typical setup:

```bash
bun run leetcode:cache
bun run db:migrate
bun dev
```
