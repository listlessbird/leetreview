import { drizzle } from 'drizzle-orm/d1'
import { env as workerEnv } from 'cloudflare:workers'

import { schema } from './schema.ts'

function getD1Binding() {
  const d1 = workerEnv?.DB
  if (!d1) {
    throw new Error(
      'Missing D1 binding "DB". Add d1_databases.DB in wrangler.jsonc.',
    )
  }
  return d1
}

export const db = drizzle(getD1Binding(), { schema })
