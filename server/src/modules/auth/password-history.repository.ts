import { getDb } from 'db/client'
import { passwordHistory } from 'db/schema'
import { desc, eq } from 'drizzle-orm'

export type PasswordHistoryRow = {
  passwordHash: string
  createdAt: Date
}

export const insertPasswordHistory = async (
  userId: string,
  passwordHash: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.insert(passwordHistory).values({ userId, passwordHash }).onConflictDoNothing()
}

export const findRecentPasswordHistory = async (userId: string, limit: number): Promise<PasswordHistoryRow[]> => {
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
