import { getDb } from 'db/client'
import { refreshTokens } from 'db/schema'
import { eq } from 'drizzle-orm'
import {
  forgotPasswordService,
  loginService,
  refreshTokenService,
  resetPasswordService,
} from 'modules/auth/auth.service'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createUser,
  deactivateUser,
  expireTokensFor,
  resetDatabase,
  tokenFromLink,
  VALID_PASSWORD,
  waitFor,
} from './helpers'

const emailSpy = vi.hoisted(() => ({ resetLinks: [] as string[], changedNotifications: [] as string[] }))

vi.mock('shared/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn((_to: string, link: string) => {
    emailSpy.resetLinks.push(link)
    return Promise.resolve()
  }),
  sendPasswordChangedEmail: vi.fn((to: string) => {
    emailSpy.changedNotifications.push(to)
    return Promise.resolve()
  }),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}))

const NEW_PASSWORD = 'BrandNewPass2@'

const requestResetToken = async (email: string): Promise<string> => {
  const before = emailSpy.resetLinks.length

  await forgotPasswordService(email)
  await waitFor(() => emailSpy.resetLinks.length > before)

  return tokenFromLink(emailSpy.resetLinks[emailSpy.resetLinks.length - 1])
}

beforeEach(async () => {
  await resetDatabase()
  emailSpy.resetLinks = []
  emailSpy.changedNotifications = []
})

afterAll(async () => {
  const { getPool } = await import('db/client')
  await getPool().end()
})

describe('password reset', () => {
  it('lets a user set a new password with a valid token', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await resetPasswordService({ token, newPassword: NEW_PASSWORD })

    const login = await loginService({ email: user.email, password: NEW_PASSWORD })
    expect(login.user.id).toBe(user.user.id)

    await expect(loginService({ email: user.email, password: VALID_PASSWORD })).rejects.toThrow()
  })

  it('refuses to reuse a token that already worked once', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await resetPasswordService({ token, newPassword: NEW_PASSWORD })

    await expect(resetPasswordService({ token, newPassword: 'ThirdPassword3#' })).rejects.toThrow(
      'Invalid or expired token',
    )
  })

  it('lets exactly one of two simultaneous resets win', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    const outcomes = await Promise.allSettled([
      resetPasswordService({ token, newPassword: NEW_PASSWORD }),
      resetPasswordService({ token, newPassword: 'ThirdPassword3#' }),
    ])

    const succeeded = outcomes.filter((o) => o.status === 'fulfilled')
    expect(succeeded).toHaveLength(1)
  })

  it('signs the user out of every device', async () => {
    const user = await createUser()

    await loginService({ email: user.email, password: VALID_PASSWORD })
    await loginService({ email: user.email, password: VALID_PASSWORD })

    const before = await getDb().select().from(refreshTokens).where(eq(refreshTokens.userId, user.user.id))
    expect(before.length).toBeGreaterThan(1)

    const token = await requestResetToken(user.email)
    await resetPasswordService({ token, newPassword: NEW_PASSWORD })

    // Sessions are retired by backdating rather than deletion, so a replayed token
    // reads as "expired" instead of "stolen". What matters is that none still work.
    const after = await getDb().select().from(refreshTokens).where(eq(refreshTokens.userId, user.user.id))
    expect(after.every((row) => row.expiresAt <= new Date())).toBe(true)

    await expect(refreshTokenService(user.refreshToken)).rejects.toThrow('Unauthorized')
  })

  it('kills the previous link when a new one is requested', async () => {
    const user = await createUser()

    const firstToken = await requestResetToken(user.email)
    const secondToken = await requestResetToken(user.email)

    expect(secondToken).not.toBe(firstToken)

    await expect(resetPasswordService({ token: firstToken, newPassword: NEW_PASSWORD })).rejects.toThrow(
      'Invalid or expired token',
    )

    await expect(resetPasswordService({ token: secondToken, newPassword: NEW_PASSWORD })).resolves.toBeUndefined()
  })

  it('rejects an expired token', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await expireTokensFor(user.user.id)

    await expect(resetPasswordService({ token, newPassword: NEW_PASSWORD })).rejects.toThrow('Invalid or expired token')
  })

  it('rejects a token belonging to a deactivated account', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await deactivateUser(user.user.id)

    await expect(resetPasswordService({ token, newPassword: NEW_PASSWORD })).rejects.toThrow('Invalid or expired token')
  })

  it('rejects a made-up token', async () => {
    await expect(resetPasswordService({ token: 'not-a-real-token', newPassword: NEW_PASSWORD })).rejects.toThrow(
      'Invalid or expired token',
    )
  })

  it('refuses a password the user has had before', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await expect(resetPasswordService({ token, newPassword: VALID_PASSWORD })).rejects.toThrow(
      'This password has already been used before',
    )
  })

  it('tells the user their password changed', async () => {
    const user = await createUser()
    const token = await requestResetToken(user.email)

    await resetPasswordService({ token, newPassword: NEW_PASSWORD })

    expect(emailSpy.changedNotifications).toContain(user.email)
  })
})

describe('forgot password', () => {
  it('says nothing and sends nothing for an unknown email', async () => {
    await expect(forgotPasswordService('nobody@example.com')).resolves.toBeUndefined()

    await new Promise((r) => setTimeout(r, 300))
    expect(emailSpy.resetLinks).toHaveLength(0)
  })

  it('sends nothing for a deactivated account', async () => {
    const user = await createUser()
    await deactivateUser(user.user.id)

    await forgotPasswordService(user.email)

    await new Promise((r) => setTimeout(r, 300))
    expect(emailSpy.resetLinks).toHaveLength(0)
  })
})
