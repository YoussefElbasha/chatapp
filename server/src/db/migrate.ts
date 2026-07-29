import 'dotenv/config'

import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { getDb, getPool } from './client'

await migrate(getDb(), { migrationsFolder: './drizzle' })
await getPool().end()
