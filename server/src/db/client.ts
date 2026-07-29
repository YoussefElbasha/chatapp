import { env } from 'config/env'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

let pool: Pool | undefined
let dbInstance: NodePgDatabase<typeof schema> | undefined

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL })
  }
  return pool
}

export const getDb = (): NodePgDatabase<typeof schema> => {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema, casing: 'snake_case' })
  }
  return dbInstance
}
