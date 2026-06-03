import { desc, eq } from 'drizzle-orm'
import { getDb } from 'db/client'
import { passwordHistory } from 'db/schema'

export type PasswordHistoryRow = {
  passwordHash: string
  createdAt: Date
}

export const insertPasswordHistory = async (
  userId: string,
  passwordHash: string,
): Promise<void> => {
  try {
    await getDb().insert(passwordHistory).values({ userId, passwordHash })
  } catch (err: any) {
    // Same (user_id, password_hash) already recorded — ignore.
    if (err?.code === '23505') return
    throw err
  }
}

export const findRecentPasswordHistory = async (
  userId: string,
  limit: number,
): Promise<PasswordHistoryRow[]> => {
  const rows = await getDb()
    .select({
      passwordHash: passwordHistory.passwordHash,
      createdAt: passwordHistory.createdAt,
    })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(limit)

  return rows as PasswordHistoryRow[]
}
