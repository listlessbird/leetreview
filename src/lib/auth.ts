import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { drizzle } from 'drizzle-orm/d1'
import { env } from '../env'

type RequestWithCf = Request & {
  cf?: IncomingRequestCfProperties
}

type CreateAuthOptions = {
  d1?: D1Database
  cf?: IncomingRequestCfProperties
}

export function createAuth(_options?: CreateAuthOptions) {
  const d1 = _options?.d1
  const database = d1
    ? drizzleAdapter(drizzle(d1), {
        provider: 'sqlite',
        usePlural: true,
      })
    : drizzleAdapter({} as D1Database, {
        provider: 'sqlite',
        usePlural: true,
      })

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip'],
      },
    },
    plugins: [tanstackStartCookies()],
    trustedOrigins: [env.BETTER_AUTH_URL],
  })
}

export const auth = createAuth()

export async function getAuthForRequest(request: Request) {
  const { env: workerEnv } = await import('cloudflare:workers')
  const d1 = workerEnv?.DB
  if (!d1) {
    throw new Error(
      'Missing D1 binding "DB". Add d1_databases.DB in wrangler.jsonc.',
    )
  }
  return createAuth({ d1, cf: (request as RequestWithCf).cf })
}
