import dotenv from 'dotenv'

dotenv.config()

export const TEST_SCHEMA = 'auth_test'

export const baseDatabaseUrl = (): string => {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL

  if (!url) throw new Error('Set DATABASE_URL (or TEST_DATABASE_URL) before running tests')

  return url
}

export const testDatabaseUrl = (): string => {
  const url = new URL(baseDatabaseUrl())
  url.searchParams.set('options', `-c search_path=${TEST_SCHEMA}`)
  return url.toString()
}
