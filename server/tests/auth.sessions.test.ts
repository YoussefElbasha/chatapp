import { getDb } from 'db/client'
import { refreshTokens } from 'db/schema'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { changePasswordService, loginService, refreshTokenService } from 'modules/auth/auth.service'
import { verifyAccessToken } from 'modules/auth/token.service'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createUser, deactivateUser, resetDatabase, VALID_PASSWORD } from './helpers'

vi.mock('shared/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendPasswordChangedEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}))

const rejectionOf = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise
  } catch (err: unknown) {
    return err as Error
  }

  throw new Error('Expected the call to fail, but it succeeded')
}

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  const { getPool } = await import('db/client')
  await getPool().end()
})

describe('login', () => {
  it('gives the same error for an unknown email and a wrong password', async () => {
    const user = await createUser()

    const unknownEmail = await rejectionOf(loginService({ email: 'nobody@example.com', password: VALID_PASSWORD }))
    const wrongPassword = await rejectionOf(loginService({ email: user.email, password: 'WrongPassword9!' }))

    expect(unknownEmail.message).toBe(wrongPassword.message)
  })

  it('refuses a deactivated account with that same error', async () => {
    const user = await createUser()
    await deactivateUser(user.user.id)

    await expect(loginService({ email: user.email, password: VALID_PASSWORD })).rejects.toThrow(
      'Invalid email or username or password',
    )
  })
})

describe('refresh token rotation', () => {
  it('swaps the old token for a new one', async () => {
    const user = await createUser()

    const rotated = await refreshTokenService(user.refreshToken)

    expect(rotated.refreshToken).not.toBe(user.refreshToken)
    expect(verifyAccessToken(rotated.accessToken).userId).toBe(user.user.id)
  })

  it('wipes every session when an already-used token comes back', async () => {
    const user = await createUser()

    await loginService({ email: user.email, password: VALID_PASSWORD })
    await loginService({ email: user.email, password: VALID_PASSWORD })

    await refreshTokenService(user.refreshToken)

    await expect(refreshTokenService(user.refreshToken)).rejects.toThrow('Unauthorized')

    const remaining = await getDb().select().from(refreshTokens).where(eq(refreshTokens.userId, user.user.id))
    expect(remaining).toHaveLength(0)
  })

  it('rejects a refresh token signed with the wrong secret', async () => {
    const forged = jwt.sign({ userId: '00000000-0000-0000-0000-000000000001' }, 'wrong-secret')

    await expect(refreshTokenService(forged)).rejects.toThrow('Unauthorized')
  })
})

describe('change password', () => {
  it('signs the user out everywhere', async () => {
    const user = await createUser()
    await loginService({ email: user.email, password: VALID_PASSWORD })

    await changePasswordService(user.user.id, {
      oldPassword: VALID_PASSWORD,
      newPassword: 'BrandNewPass2@',
    })

    const remaining = await getDb().select().from(refreshTokens).where(eq(refreshTokens.userId, user.user.id))
    expect(remaining).toHaveLength(0)
  })

  it('refuses a password the user has had before', async () => {
    const user = await createUser()

    await changePasswordService(user.user.id, {
      oldPassword: VALID_PASSWORD,
      newPassword: 'BrandNewPass2@',
    })

    await expect(
      changePasswordService(user.user.id, {
        oldPassword: 'BrandNewPass2@',
        newPassword: VALID_PASSWORD,
      }),
    ).rejects.toThrow('This password has already been used before')
  })

  it('refuses when the old password is wrong', async () => {
    const user = await createUser()

    await expect(
      changePasswordService(user.user.id, {
        oldPassword: 'NotMyPassword9!',
        newPassword: 'BrandNewPass2@',
      }),
    ).rejects.toThrow("Old password doesn't match current password")
  })
})

describe('access token verification', () => {
  it('accepts a token we signed', async () => {
    const user = await createUser()
    expect(verifyAccessToken(user.accessToken).userId).toBe(user.user.id)
  })

  it.each([
    ['garbage', 'garbage'],
    ['empty', ''],
    ['wrong secret', jwt.sign({ userId: 'someone' }, 'wrong-secret')],
    ['no userId claim', jwt.sign({ sub: 'someone' }, process.env.JWT_ACCESS_SECRET as string)],
  ])('rejects %s', (_label, token) => {
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'someone' }, process.env.JWT_ACCESS_SECRET as string, { expiresIn: '-1s' })
    expect(() => verifyAccessToken(expired)).toThrow()
  })
})
