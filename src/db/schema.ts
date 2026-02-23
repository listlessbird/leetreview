import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import * as authSchema from './auth.schema'

export const todos = sqliteTable('todos', {
  id: integer({ mode: 'number' }).primaryKey({
    autoIncrement: true,
  }),
  title: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const schema = {
  ...authSchema,
  todos,
} as const
