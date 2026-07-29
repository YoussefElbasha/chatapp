import { getDb } from 'db/client'
import { refreshTokens, tokens } from 'db/schema'
import { lt } from 'drizzle-orm'

export const cleanupExpiredTokens = async (): Promise<{ tokens: number; refreshTokens: number }> => {
  const now = new Date()
  const db = getDb()

  const tokensDeleted = await db.delete(tokens).where(lt(tokens.expiresAt, now))
  const refreshDeleted = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, now))

  return {
    tokens: tokensDeleted.rowCount ?? 0,
    refreshTokens: refreshDeleted.rowCount ?? 0,
  }
}
