import { execFileSync } from 'child_process'
import { Client } from 'pg'

import { baseDatabaseUrl, TEST_SCHEMA } from './test-db'

const connectionEnv = (): NodeJS.ProcessEnv => {
  const url = new URL(baseDatabaseUrl())

  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.replace(/^\//, ''),
  }
}

const majorVersionOf = (versionOutput: string): number => Number(/(\d+)/.exec(versionOutput)?.[1] ?? 0)

const findPgDump = (serverMajor: number): string => {
  const candidates = [
    process.env.PGDUMP,
    'pg_dump',
    process.platform === 'win32'
      ? `C:\\Program Files\\PostgreSQL\\${serverMajor}\\bin\\pg_dump.exe`
      : `/usr/lib/postgresql/${serverMajor}/bin/pg_dump`,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue

    try {
      const version = execFileSync(candidate, ['--version'], { encoding: 'utf8' })
      if (majorVersionOf(version) >= serverMajor) return candidate
    } catch {
      // Not installed at this path, or not runnable — try the next one.
    }
  }

  throw new Error(
    `The tests need pg_dump version ${serverMajor} or newer to build the test schema, ` +
      'but no suitable one was found. Install matching PostgreSQL client tools, ' +
      'or set PGDUMP to the full path of the right binary.',
  )
}

const dumpPublicSchemaDdl = (serverMajor: number): string => {
  const dump = execFileSync(
    findPgDump(serverMajor),
    ['--schema-only', '--no-owner', '--no-privileges', '--schema=public'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: connectionEnv() },
  )

  return dump
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return !(
        trimmed.startsWith('\\') ||
        trimmed.startsWith('SET ') ||
        trimmed.startsWith('SELECT pg_catalog.') ||
        /^(COMMENT ON|CREATE|ALTER|DROP) SCHEMA\b/.test(trimmed)
      )
    })
    .join('\n')
    .replace(/\bpublic\./g, '')
}

export default async function setup(): Promise<void> {
  const client = new Client({ connectionString: baseDatabaseUrl() })
  await client.connect()

  try {
    const { rows } = await client.query<{ version: string }>(`select current_setting('server_version_num') as version`)
    const serverMajor = Math.floor(Number(rows[0].version) / 10000)

    const ddl = dumpPublicSchemaDdl(serverMajor)

    await client.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`)
    await client.query(`CREATE SCHEMA ${TEST_SCHEMA}`)
    await client.query(`SET search_path TO ${TEST_SCHEMA}`)
    await client.query(ddl)
  } finally {
    await client.end()
  }
}
