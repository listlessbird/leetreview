Welcome to your new TanStack Start app! 

## Cloudflare D1 + GitHub Auth Setup

This project is configured to run Better Auth on Cloudflare Workers with a D1 binding (`DB`).

1. Configure local env values in `.env.local`:

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<generate with: npx @better-auth/cli@latest secret>
GITHUB_CLIENT_ID=<github oauth app client id>
GITHUB_CLIENT_SECRET=<github oauth app client secret>
```

2. Configure Wrangler:

- Update `wrangler.jsonc` `d1_databases[0].database_id`.
- Set secrets in Cloudflare:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

3. Generate auth schema + migrations:

```bash
npm run auth:generate
npm run db:generate
```

4. Apply D1 migrations:

```bash
wrangler d1 migrations apply review-auth-db --local
wrangler d1 migrations apply review-auth-db --remote
```

# Getting Started

To run this application:

```bash
bun install
bun --bun run dev
```

# Building For Production

To build this application for production:

```bash
bun --bun run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bun --bun run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `bun install @tailwindcss/vite tailwindcss -D`

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
bun --bun run lint
bun --bun run format
bun --bun run check
```


## Shadcn

Add components using the latest version of [Shadcn](https://ui.shadcn.com/).

```bash
pnpm dlx shadcn@latest add button
```


## T3Env

- You can use T3Env to add type safety to your environment variables.
- Add Environment variables to the `src/env.mjs` file.
- Use the environment variables in your code.

### Usage

```ts
import { env } from "#/env";

console.log(env.VITE_APP_TITLE);
```





## Setting up Better Auth

1. Generate and set the `BETTER_AUTH_SECRET` environment variable in your `.env.local`:

   ```bash
   bunx --bun @better-auth/cli secret
   ```

2. Visit the [Better Auth documentation](https://www.better-auth.com) to unlock the full potential of authentication in your app.

### Adding a Database (Optional)

Better Auth can work in stateless mode, but to persist user data, add a database:

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // ... rest of config
});
```

Then run migrations:

```bash
bunx --bun @better-auth/cli migrate
```


# Apollo Client Integration

This add-on integrates Apollo Client with TanStack Start to provide modern streaming SSR support for GraphQL data fetching.

## Dependencies

The following packages are automatically installed:

- `@apollo/client` - Apollo Client core
- `@apollo/client-integration-tanstack-start` - TanStack Start integration
- `graphql` - GraphQL implementation

## Configuration

### 1. GraphQL Endpoint

Configure your GraphQL API endpoint in `src/router.tsx`:

```tsx
// Configure Apollo Client
const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: 'https://your-graphql-api.example.com/graphql', // Update this!
  }),
})
```

You can use environment variables by creating a `.env.local` file:

```bash
VITE_GRAPHQL_ENDPOINT=https://your-api.com/graphql
```

The default configuration already uses this pattern:

```tsx
uri: import.meta.env.VITE_GRAPHQL_ENDPOINT ||
  'https://your-graphql-api.example.com/graphql'
```

## Usage Patterns

### Pattern 1: Loader with preloadQuery (Recommended for SSR)

Use `preloadQuery` in route loaders for optimal streaming SSR performance:

```tsx
import { gql, TypedDocumentNode } from '@apollo/client'
import { useReadQuery } from '@apollo/client/react'
import { createFileRoute } from '@tanstack/react-router'

const MY_QUERY: TypedDocumentNode<{
  posts: { id: string; title: string; content: string }[]
}> = gql`
  query GetData {
    posts {
      id
      title
      content
    }
  }
`

export const Route = createFileRoute('/my-route')({
  component: RouteComponent,
  loader: ({ context: { preloadQuery } }) => {
    const queryRef = preloadQuery(MY_QUERY, {
      variables: {},
    })
    return { queryRef }
  },
})

function RouteComponent() {
  const { queryRef } = Route.useLoaderData()
  const { data } = useReadQuery(queryRef)

  return <div>{/* render your data */}</div>
}
```

### Pattern 2: useSuspenseQuery

Use `useSuspenseQuery` directly in components with automatic suspense support:

```tsx
import { gql, TypedDocumentNode } from '@apollo/client'
import { useSuspenseQuery } from '@apollo/client/react'
import { createFileRoute } from '@tanstack/react-router'

const MY_QUERY: TypedDocumentNode<{
  posts: { id: string; title: string }[]
}> = gql`
  query GetData {
    posts {
      id
      title
    }
  }
`

export const Route = createFileRoute('/my-route')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useSuspenseQuery(MY_QUERY)

  return <div>{/* render your data */}</div>
}
```

### Pattern 3: Manual Refetching

```tsx
import { useQueryRefHandlers, useReadQuery } from '@apollo/client/react'

function MyComponent() {
  const { queryRef } = Route.useLoaderData()
  const { refetch } = useQueryRefHandlers(queryRef)
  const { data } = useReadQuery(queryRef)

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {/* render data */}
    </div>
  )
}
```

## Important Notes

### SSR Optimization

The integration automatically handles:

- Query deduplication across server and client
- Streaming SSR with `@defer` directive support
- Proper cache hydration

## Learn More

- [Apollo Client Documentation](https://www.apollographql.com/docs/react)
- [@apollo/client-integration-tanstack-start](https://www.npmjs.com/package/@apollo/client-integration-tanstack-start)

## Demo

Visit `/demo/apollo-client` in your application to see a working example of Apollo Client integration.



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
