import { getDb, getPool } from 'db/client'
import { tokens, users } from 'db/schema'
import { eq } from 'drizzle-orm'
import { registerService } from 'modules/auth/auth.service'
import { expect } from 'vitest'

import { TEST_SCHEMA } from './test-db'

export const VALID_PASSWORD = 'InitialPass1!'

let counter = 0

export const resetDatabase = async (): Promise<void> => {
  const { rows } = await getPool().query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = $1`,
    [TEST_SCHEMA],
  )

  if (rows.length === 0) throw new Error(`Test schema "${TEST_SCHEMA}" has no tables — did global setup run?`)

  const names = rows.map((row) => `"${TEST_SCHEMA}"."${row.tablename}"`).join(', ')
  await getPool().query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`)
}

export const createUser = async (password: string = VALID_PASSWORD) => {
  counter += 1

  const email = `user${counter}.${Date.now()}@example.com`

  const result = await registerService({
    email,
    username: `user${counter}${Date.now().toString().slice(-5)}`,
    password,
    displayName: undefined,
  })

  return { ...result, email, password }
}

export const deactivateUser = async (userId: string): Promise<void> => {
  await getDb().update(users).set({ isActive: false }).where(eq(users.id, userId))
}

export const expireTokensFor = async (userId: string): Promise<void> => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  await getDb().update(tokens).set({ createdAt: twoHoursAgo, expiresAt: oneHourAgo }).where(eq(tokens.userId, userId))
}

export const waitFor = async (check: () => boolean, timeoutMs = 5000): Promise<void> => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 25))
  }

  throw new Error('Timed out waiting for background work')
}

export const tokenFromLink = (link: string): string => {
  const token = new URL(link).searchParams.get('token')
  expect(token, `no token in reset link: ${link}`).toBeTruthy()
  return token as string
}

export type EmailSpy = {
  resetLinks: string[]
  changedNotifications: string[]
}
