import { Pool } from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

let pool: Pool | undefined
let dbInstance: NodePgDatabase<typeof schema> | undefined

export const getPool = (): Pool => {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not defined')
    pool = new Pool({ connectionString: url })
  }
  return pool
}

export const getDb = (): NodePgDatabase<typeof schema> => {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema, casing: 'snake_case' })
  }
  return dbInstance
}
