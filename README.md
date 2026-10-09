# leet-review

a personal spaced repetition app for reviewing lc problems. Add problems, let [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) schedule your reviews, and rate your recall each day.

## Scripts

```bash
# Development
pnpm dev              # start dev server on :3000
pnpm build        # production build
pnpm preview      # build + start the production server locally

# Auth
pnpm auth:generate   # generate Better Auth schema → src/db/auth.schema.ts
pnpm auth:migrate    # run Better Auth migrations via CLI

# Database
pnpm db:generate  # generate SQL migrations from schema
pnpm db:migrate   # apply generated migrations to the active database target
pnpm db:push      # push schema directly to the active database target
pnpm db:pull      # pull schema from the active database target
pnpm db:studio    # open Drizzle Studio

# LeetCode search cache
pnpm leetcode:cache # write a local search index to ./data/leetcode-cache.json

# Code quality
pnpm lint         # biome lint
pnpm format       # biome format
pnpm check        # biome check (lint + format)
pnpm test         # vitest run
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
pnpm leetcode:cache
pnpm db:migrate
pnpm dev
```
