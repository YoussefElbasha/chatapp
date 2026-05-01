import { Pool } from 'pg'

let pool: Pool

export const getPool = () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!pool) {
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'discord',
      password: process.env.DB_PASSWORD,
      database: 'discord_clone',
    })
  }

  return pool
}
