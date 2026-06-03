import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from 'db/client'
import { tokens } from 'db/schema'

export type TokenType = 'email_verification' | 'password_reset'

export type OneTimeTokenRow = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  type: TokenType
}

export type InsertOneTimeTokenDto = {
  userId: string
  tokenHash: string
  type: TokenType
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

export const insertOneTimeToken = async (dto: InsertOneTimeTokenDto): Promise<void> => {
  await getDb().insert(tokens).values({
    userId: dto.userId,
    tokenHash: dto.tokenHash,
    type: dto.type,
    expiresAt: dto.expiresAt,
    ipAddress: dto.ipAddress ?? null,
    userAgent: dto.userAgent ?? null,
  })
}

export const findOneTimeTokenByHash = async (
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
      and(eq(tokens.tokenHash, tokenHash), eq(tokens.type, type), isNull(tokens.usedAt)),
    )
    .limit(1)

  return (rows[0] as OneTimeTokenRow | undefined) ?? null
}

export const markOneTimeTokenUsed = async (id: string): Promise<void> => {
  await getDb().update(tokens).set({ usedAt: new Date() }).where(eq(tokens.id, id))
}

export const markPendingTokensUsed = async (userId: string, type: TokenType): Promise<void> => {
  await getDb()
    .update(tokens)
    .set({ usedAt: new Date() })
    .where(and(eq(tokens.userId, userId), eq(tokens.type, type), isNull(tokens.usedAt)))
}
