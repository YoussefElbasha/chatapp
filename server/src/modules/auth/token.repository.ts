import { and, eq, ne } from 'drizzle-orm'
import { getDb } from 'db/client'
import { refreshTokens } from 'db/schema'

import type { InsertRefreshTokenDto, RefreshTokenDb } from './token.types'

export const insertRefreshToken = async (dto: InsertRefreshTokenDto): Promise<void> => {
  await getDb().insert(refreshTokens).values({
    userId: dto.userId,
    tokenHash: dto.tokenHash,
    expiresAt: dto.expiresAt,
    ipAddress: dto.ipAddress ?? null,
    userAgent: dto.userAgent ?? null,
  })
}

export const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshTokenDb | null> => {
  const rows = await getDb()
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1)

  return rows[0] ?? null
}

export const deleteRefreshTokenByHash = async (tokenHash: string): Promise<void> => {
  await getDb().delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
}

export const deleteAllRefreshTokensByUserId = async (userId: string): Promise<void> => {
  await getDb().delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export const deleteRefreshTokensExceptHash = async (
  userId: string,
  keepHash: string,
): Promise<void> => {
  await getDb()
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), ne(refreshTokens.tokenHash, keepHash)))
}
