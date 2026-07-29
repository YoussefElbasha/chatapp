const UNIQUE_VIOLATION = '23505'

type PostgresError = { code?: unknown; constraint?: unknown }

const asPostgresError = (err: unknown): PostgresError | null =>
  typeof err === 'object' && err !== null ? (err as PostgresError) : null

export const uniqueViolationOf = (err: unknown): string | null => {
  const pgError = asPostgresError(err)

  if (pgError?.code !== UNIQUE_VIOLATION) return null

  return typeof pgError.constraint === 'string' ? pgError.constraint : ''
}
