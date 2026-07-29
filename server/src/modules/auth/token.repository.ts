import { getDb } from 'db/client'
import { refreshTokens, tokens } from 'db/schema'
import { and, eq, gt, isNull, ne } from 'drizzle-orm'

import type {
  InsertOneTimeTokenDto,
  InsertRefreshTokenDto,
  OneTimeTokenRow,
  RefreshTokenDb,
  TokenType,
} from './token.types'

export const insertRefreshToken = async (dto: InsertRefreshTokenDto): Promise<void> => {
  await getDb()
    .insert(refreshTokens)
    .values({
      userId: dto.userId,
      tokenHash: dto.tokenHash,
      expiresAt: dto.expiresAt,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
    })
}

export const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshTokenDb | null> => {
  const rows = await getDb().select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1)

  return rows[0] ?? null
}

export const deleteRefreshTokenByHash = async (tokenHash: string): Promise<void> => {
  await getDb().delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
}

export const deleteAllRefreshTokensByUserId = async (
  userId: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export const deleteRefreshTokensExceptHash = async (userId: string, keepHash: string): Promise<void> => {
  await getDb()
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), ne(refreshTokens.tokenHash, keepHash)))
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
