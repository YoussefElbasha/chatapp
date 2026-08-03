import { getDb } from 'db/client'
import { users } from 'db/schema'
import { eq } from 'drizzle-orm'
import { loginService, registerService, resendVerificationService, verifyEmailService } from 'modules/auth/auth.service'
import { type AppError } from 'shared/utils/errors/app-error'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createUnverifiedUser,
  createUser,
  deactivateUser,
  expireTokensFor,
  resetDatabase,
  tokenFromLink,
  VALID_PASSWORD,
  waitFor,
} from './helpers'

const emailSpy = vi.hoisted(() => ({ verificationLinks: [] as string[] }))

vi.mock('shared/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendPasswordChangedEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn((_to: string, link: string) => {
    emailSpy.verificationLinks.push(link)
    return Promise.resolve()
  }),
}))

const linkFor = async (before: number): Promise<string> => {
  await waitFor(() => emailSpy.verificationLinks.length > before)
  return tokenFromLink(emailSpy.verificationLinks[emailSpy.verificationLinks.length - 1])
}

const rejectionOf = async (promise: Promise<unknown>): Promise<AppError> => {
  try {
    await promise
  } catch (err: unknown) {
    return err as AppError
  }

  throw new Error('Expected the call to fail, but it succeeded')
}

beforeEach(async () => {
  await resetDatabase()
  emailSpy.verificationLinks = []
})

afterAll(async () => {
  const { getPool } = await import('db/client')
  await getPool().end()
})

describe('registration', () => {
  it('sends a verification link and hands back no session', async () => {
    const result = await registerService({
      email: `fresh.${Date.now()}@example.com`,
      username: `fresh${Date.now().toString().slice(-6)}`,
      password: VALID_PASSWORD,
      displayName: undefined,
    })

    expect(Object.keys(result)).toEqual(['user'])
    await expect(linkFor(0)).resolves.toBeTruthy()
  })

  it('leaves the new account unverified', async () => {
    const { user } = await createUnverifiedUser()

    const [row] = await getDb().select({ verified: users.emailVerified }).from(users).where(eq(users.id, user.id))
    expect(row.verified).toBe(false)
  })
})

describe('login gate', () => {
  it('refuses an unverified account with a code the client can act on', async () => {
    const { email } = await createUnverifiedUser()

    const err = await rejectionOf(loginService({ email, password: VALID_PASSWORD }))

    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('still hides a wrong password behind the generic error', async () => {
    const { email } = await createUnverifiedUser()

    // The verification error must only appear once the password already checked
    // out, otherwise it becomes a way to test whether an address is registered.
    const err = await rejectionOf(loginService({ email, password: 'WrongPassword9!' }))

    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Invalid email or username or password')
  })

  it('lets the user in once the address is confirmed', async () => {
    const { email } = await createUnverifiedUser()

    await verifyEmailService(await linkFor(0))

    const session = await loginService({ email, password: VALID_PASSWORD })
    expect(session.accessToken).toBeTruthy()
  })
})

describe('verify email', () => {
  it('refuses a link that has already been used', async () => {
    const { user } = await createUnverifiedUser()
    const token = await linkFor(0)

    await verifyEmailService(token)

    await expect(verifyEmailService(token)).rejects.toThrow('Invalid or expired token')

    const [row] = await getDb().select({ verified: users.emailVerified }).from(users).where(eq(users.id, user.id))
    expect(row.verified).toBe(true)
  })

  it('lets exactly one of two simultaneous submissions win', async () => {
    await createUnverifiedUser()
    const token = await linkFor(0)

    const outcomes = await Promise.allSettled([verifyEmailService(token), verifyEmailService(token)])

    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1)
  })

  it('refuses an expired link', async () => {
    const { user } = await createUnverifiedUser()
    const token = await linkFor(0)

    await expireTokensFor(user.id)

    await expect(verifyEmailService(token)).rejects.toThrow('Invalid or expired token')
  })

  it('refuses a link belonging to a deactivated account', async () => {
    const { user } = await createUnverifiedUser()
    const token = await linkFor(0)

    await deactivateUser(user.id)

    await expect(verifyEmailService(token)).rejects.toThrow('Invalid or expired token')
  })

  it('refuses a made-up token', async () => {
    await expect(verifyEmailService('not-a-real-token')).rejects.toThrow('Invalid or expired token')
  })
})

describe('resend verification', () => {
  it('supersedes the previous link', async () => {
    const { email } = await createUnverifiedUser()
    const first = await linkFor(0)

    await resendVerificationService(email)
    const second = await linkFor(1)

    expect(second).not.toBe(first)
    await expect(verifyEmailService(first)).rejects.toThrow('Invalid or expired token')
    await expect(verifyEmailService(second)).resolves.toBeUndefined()
  })

  it('says nothing and sends nothing for an unknown address', async () => {
    await resendVerificationService('nobody@example.com')

    expect(emailSpy.verificationLinks).toHaveLength(0)
  })

  it('sends nothing to an account that is already verified', async () => {
    const user = await createUser()
    emailSpy.verificationLinks = []

    await resendVerificationService(user.email)

    expect(emailSpy.verificationLinks).toHaveLength(0)
  })

  it('sends nothing to a deactivated account', async () => {
    const { user, email } = await createUnverifiedUser()
    await linkFor(0)
    await deactivateUser(user.id)
    emailSpy.verificationLinks = []

    await resendVerificationService(email)

    expect(emailSpy.verificationLinks).toHaveLength(0)
  })
})
