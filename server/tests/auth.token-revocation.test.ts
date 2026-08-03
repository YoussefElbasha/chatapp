import { getDb } from 'db/client'
import { refreshTokens } from 'db/schema'
import { eq } from 'drizzle-orm'
import {
  changePasswordService,
  forgotPasswordService,
  loginService,
  logoutAllService,
  logoutService,
  refreshTokenService,
  resetPasswordService,
} from 'modules/auth/auth.service'
import { isTokenRevoked } from 'modules/auth/revocation'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createUser, deactivateUser, resetDatabase, tokenFromLink, VALID_PASSWORD, waitFor } from './helpers'

const emailSpy = vi.hoisted(() => ({ resetLinks: [] as string[] }))

vi.mock('shared/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn((_to: string, link: string) => {
    emailSpy.resetLinks.push(link)
    return Promise.resolve()
  }),
  sendPasswordChangedEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}))

const NEW_PASSWORD = 'BrandNewPass2@'

const usableSessionCount = async (userId: string): Promise<number> => {
  const rows = await getDb().select().from(refreshTokens).where(eq(refreshTokens.userId, userId))
  return rows.filter((row) => row.expiresAt > new Date()).length
}

beforeEach(async () => {
  await resetDatabase()
  emailSpy.resetLinks = []
})

afterAll(async () => {
  const { getPool } = await import('db/client')
  await getPool().end()
})

describe('refresh rotation under concurrency', () => {
  it('lets exactly one of two simultaneous refreshes win', async () => {
    const user = await createUser()

    // The whole point of rotation: presenting one token twice must not yield two
    // sessions. A select-then-delete would let both callers through here.
    const outcomes = await Promise.allSettled([
      refreshTokenService(user.refreshToken),
      refreshTokenService(user.refreshToken),
    ])

    const winners = outcomes.filter((o) => o.status === 'fulfilled')
    const losers = outcomes.filter((o) => o.status === 'rejected')

    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
  })

  it('burns every session once the same token is seen twice', async () => {
    const user = await createUser()

    await Promise.allSettled([refreshTokenService(user.refreshToken), refreshTokenService(user.refreshToken)])

    // A token presented twice is either a broken client or a stolen copy. Either
    // way the family is no longer trustworthy, including whatever the winner minted.
    expect(await usableSessionCount(user.user.id)).toBe(0)
  })
})

describe('logging out does not look like theft', () => {
  it('rejects a replayed token after logout without touching other sessions', async () => {
    const user = await createUser()
    const other = await loginService({ email: user.email, password: VALID_PASSWORD })

    await logoutService(user.refreshToken)

    // The signed JWT stays valid for another 30 days, so a stale tab or a retry can
    // easily replay it. That must not be mistaken for a stolen token.
    await expect(refreshTokenService(user.refreshToken)).rejects.toThrow('Unauthorized')

    const stillWorks = await refreshTokenService(other.refreshToken)
    expect(stillWorks.accessToken).toBeTruthy()
  })

  it('still treats a genuinely rotated token as reuse', async () => {
    const user = await createUser()

    const rotated = await refreshTokenService(user.refreshToken)
    await loginService({ email: user.email, password: VALID_PASSWORD })

    await expect(refreshTokenService(user.refreshToken)).rejects.toThrow('Unauthorized')

    // Reuse of a rotated token burns everything, including the token that replaced
    // it and any session opened since.
    await expect(refreshTokenService(rotated.refreshToken)).rejects.toThrow('Unauthorized')
    expect(await usableSessionCount(user.user.id)).toBe(0)
  })
})

describe('access token revocation', () => {
  const secondsAgo = (n: number): number => Math.floor(Date.now() / 1000) - n

  it('turns down tokens issued before a sign-out-everywhere', async () => {
    const user = await createUser()

    await logoutAllService(user.user.id)

    expect(await isTokenRevoked(user.user.id, secondsAgo(5))).toBe(true)
  })

  it('keeps honouring a token issued after the sign-out', async () => {
    const user = await createUser()

    await logoutAllService(user.user.id)

    expect(await isTokenRevoked(user.user.id, secondsAgo(-5))).toBe(false)
  })

  it('turns down tokens issued before a password change', async () => {
    const user = await createUser()

    await changePasswordService(user.user.id, { oldPassword: VALID_PASSWORD, newPassword: NEW_PASSWORD })

    expect(await isTokenRevoked(user.user.id, secondsAgo(5))).toBe(true)
  })

  it('turns down tokens issued before a password reset', async () => {
    const user = await createUser()

    await forgotPasswordService(user.email)
    await waitFor(() => emailSpy.resetLinks.length > 0)

    await resetPasswordService({ token: tokenFromLink(emailSpy.resetLinks[0]), newPassword: NEW_PASSWORD })

    expect(await isTokenRevoked(user.user.id, secondsAgo(5))).toBe(true)
  })

  it('turns down every token for a deactivated account', async () => {
    const user = await createUser()

    await deactivateUser(user.user.id)

    expect(await isTokenRevoked(user.user.id, secondsAgo(-5))).toBe(true)
  })

  it('leaves an untouched account alone', async () => {
    const user = await createUser()

    expect(await isTokenRevoked(user.user.id, secondsAgo(5))).toBe(false)
  })
})

describe('password change and outstanding reset links', () => {
  it('kills a reset link the user requested before changing their password', async () => {
    const user = await createUser()

    await forgotPasswordService(user.email)
    await waitFor(() => emailSpy.resetLinks.length > 0)
    const link = tokenFromLink(emailSpy.resetLinks[0])

    await changePasswordService(user.user.id, { oldPassword: VALID_PASSWORD, newPassword: NEW_PASSWORD })

    // Whoever just proved they know the current password gets to retire the link
    // sitting in the inbox.
    await expect(resetPasswordService({ token: link, newPassword: 'ThirdPassword3#' })).rejects.toThrow(
      'Invalid or expired token',
    )
  })
})
