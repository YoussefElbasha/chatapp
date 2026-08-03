import { getDb } from 'db/client'
import { refreshTokens, tokens } from 'db/schema'
import { and, eq, gt, isNull } from 'drizzle-orm'

import type {
  InsertOneTimeTokenDto,
  InsertRefreshTokenDto,
  OneTimeTokenRow,
  RefreshTokenDb,
  TokenType,
} from './token.types'

export const insertRefreshToken = async (
  dto: InsertRefreshTokenDto,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db
    .insert(refreshTokens)
    .values({
      userId: dto.userId,
      tokenHash: dto.tokenHash,
      expiresAt: dto.expiresAt,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
    })
}

/**
 * Takes a refresh token out of circulation and reports whether *we* were the ones
 * who took it. The delete and the read are one statement on purpose: Postgres locks
 * the row, so when the same token arrives twice at once exactly one caller gets a
 * row back and the other gets null. Splitting this into a select-then-delete lets
 * both callers through, which is precisely the theft that rotation exists to catch.
 */
export const claimRefreshToken = async (
  tokenHash: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<RefreshTokenDb | null> => {
  const rows = await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).returning()

  return rows[0] ?? null
}

/**
 * Retires a token by backdating it rather than deleting it.
 *
 * The distinction carries meaning: a *missing* row means the token was rotated away
 * and anyone still holding it is replaying a stolen copy, so we burn every session.
 * A row that is merely expired means the user logged out or changed their password
 * normally, which deserves a plain 401 and nothing more. Delete on those paths and
 * the two cases become indistinguishable, so a logged-out tab replaying its own
 * token would sign the user out everywhere. The nightly cleanup reaps these rows.
 */
export const expireRefreshTokenByHash = async (tokenHash: string): Promise<void> => {
  await getDb().update(refreshTokens).set({ expiresAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash))
}

export const expireRefreshTokensByUserId = async (
  userId: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.update(refreshTokens).set({ expiresAt: new Date() }).where(eq(refreshTokens.userId, userId))
}

export const deleteAllRefreshTokensByUserId = async (
  userId: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export const insertOneTimeToken = async (
  dto: InsertOneTimeTokenDto,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.insert(tokens).values({
    userId: dto.userId,
    tokenHash: dto.tokenHash,
    type: dto.type,
    expiresAt: dto.expiresAt,
    ipAddress: dto.ipAddress ?? null,
    userAgent: dto.userAgent ?? null,
  })
}

export const findValidOneTimeTokenByHash = async (
  tokenHash: string,
  type: TokenType,
): Promise<OneTimeTokenRow | null> => {
  const rows = await getDb()
    .select({
      id: tokens.id,
      userId: tokens.userId,
      tokenHash: tokens.tokenHash,
      expiresAt: tokens.expiresAt,
      type: tokens.type,
    })
    .from(tokens)
    .where(
      and(
        eq(tokens.tokenHash, tokenHash),
        eq(tokens.type, type),
        isNull(tokens.usedAt),
        gt(tokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return (rows[0] as OneTimeTokenRow | undefined) ?? null
}

export const markPendingTokensUsed = async (
  userId: string,
  type: TokenType,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db
    .update(tokens)
    .set({ usedAt: new Date() })
    .where(and(eq(tokens.userId, userId), eq(tokens.type, type), isNull(tokens.usedAt)))
}

export const consumeOneTimeToken = async (id: string, db: ReturnType<typeof getDb> = getDb()): Promise<boolean> => {
  const rows = await db
    .update(tokens)
    .set({ usedAt: new Date() })
    .where(and(eq(tokens.id, id), isNull(tokens.usedAt)))
    .returning({ id: tokens.id })

  return rows.length > 0
}
