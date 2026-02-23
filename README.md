# leet-review

A personal spaced repetition app for reviewing LeetCode problems before coding interviews. Add problem URLs, let [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) schedule your reviews, and rate your recall each day.

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

# Database (Drizzle)
bun run db:generate  # generate SQL migrations from schema
bun run db:migrate   # apply migrations (uses d1-http driver)
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

## Local setup

### 1. Install dependencies

```bash
bun install
```

### 2. Environment variables

Copy and fill in `.env.local`:

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=           # generate: bunx @better-auth/cli secret
GITHUB_CLIENT_ID=             # GitHub OAuth App → Settings → Developer settings
GITHUB_CLIENT_SECRET=

# Drizzle Studio / db:push / db:pull (not needed at runtime)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=    # from wrangler.jsonc d1_databases[0].database_id
CLOUDFLARE_D1_TOKEN=          # Cloudflare API token with D1 edit permission
```

### 3. GitHub OAuth App

Create an OAuth App at **GitHub → Settings → Developer settings → OAuth Apps**:

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

### 4. Apply D1 migrations locally

```bash
npx wrangler d1 migrations apply leet-review-app --local
```

### 5. Run

```bash
bun dev
```

## Deployment

### Cloudflare secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### Apply migrations to remote D1

```bash
npx wrangler d1 migrations apply leet-review-app --remote
```

### Deploy

```bash
bun run deploy
```
