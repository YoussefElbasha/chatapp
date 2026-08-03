import app from 'app'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createUnverifiedUser, createUser, resetDatabase, VALID_PASSWORD } from './helpers'

vi.mock('shared/email/email.service', () => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendPasswordChangedEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}))

const AUTH = '/api/v1/auth'

type JsonBody = {
  message?: string
  code?: string
  errors?: unknown
  accessToken?: string
  refreshToken?: string
  user?: { id?: string; email?: string; createdAt?: string; updatedAt?: string }
}

/** supertest types `res.body` as `any`; give it a shape so the assertions stay honest. */
const body = (res: request.Response): JsonBody => res.body as JsonBody

const cookiesOf = (res: request.Response): string[] => {
  const raw: unknown = res.headers['set-cookie']
  return Array.isArray(raw) ? (raw as string[]) : []
}

const refreshCookie = (res: request.Response): string | undefined =>
  cookiesOf(res).find((c) => c.startsWith('refreshToken='))

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  const { getPool } = await import('db/client')
  await getPool().end()
})

describe('POST /register', () => {
  it('creates the account without opening a session', async () => {
    const res = await request(app)
      .post(`${AUTH}/register`)
      .send({
        email: `http.${Date.now()}@example.com`,
        username: `http${Date.now().toString().slice(-6)}`,
        password: VALID_PASSWORD,
      })

    expect(res.status).toBe(201)
    expect(body(res).user?.id).toBeTruthy()
    expect(body(res).accessToken).toBeUndefined()
    expect(refreshCookie(res)).toBeUndefined()
  })

  it('rejects a weak password with field-level detail', async () => {
    const res = await request(app)
      .post(`${AUTH}/register`)
      .send({ email: 'someone@example.com', username: 'someone', password: 'short' })

    expect(res.status).toBe(400)
    expect(body(res).message).toBe('Validation failed')
    expect(body(res).errors).toBeTruthy()
  })
})

describe('POST /login', () => {
  it('returns an access token and sets a hardened refresh cookie', async () => {
    const user = await createUser()

    const res = await request(app).post(`${AUTH}/login`).send({ email: user.email, password: VALID_PASSWORD })

    expect(res.status).toBe(200)
    expect(body(res).accessToken).toBeTruthy()

    const cookie = refreshCookie(res)
    expect(cookie).toBeTruthy()
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    // The refresh token must never be readable by the page, and must never appear
    // in the JSON body where a client could stash it somewhere scriptable.
    expect(body(res).refreshToken).toBeUndefined()
  })

  it('reports an unverified account distinctly from a bad password', async () => {
    const { email } = await createUnverifiedUser()

    const unverified = await request(app).post(`${AUTH}/login`).send({ email, password: VALID_PASSWORD })
    const wrongPassword = await request(app).post(`${AUTH}/login`).send({ email, password: 'WrongPassword9!' })

    expect(unverified.status).toBe(403)
    expect(body(unverified).code).toBe('EMAIL_NOT_VERIFIED')
    expect(wrongPassword.status).toBe(401)
    expect(body(wrongPassword).code).toBeUndefined()
  })
})

describe('GET /me', () => {
  it('rejects a request with no bearer token', async () => {
    const res = await request(app).get(`${AUTH}/me`)

    expect(res.status).toBe(401)
    expect(body(res).message).toBe('Unauthorized')
  })

  it('rejects a malformed authorization header', async () => {
    const res = await request(app).get(`${AUTH}/me`).set('Authorization', 'Basic abc123')

    expect(res.status).toBe(401)
  })

  it('returns the full profile for a valid token', async () => {
    const user = await createUser()

    const res = await request(app).get(`${AUTH}/me`).set('Authorization', `Bearer ${user.accessToken}`)

    expect(res.status).toBe(200)
    expect(body(res).user?.email).toBe(user.email)
    // These come from columns the query used to leave out, which silently made them
    // undefined in the response.
    expect(body(res).user?.createdAt).toBeTruthy()
    expect(body(res).user?.updatedAt).toBeTruthy()
  })

  it('stops accepting a token after signing out everywhere', async () => {
    const user = await createUser()

    // The watermark only has second resolution, so a token minted in the same
    // second as the logout is deliberately spared — otherwise signing straight
    // back in would hand you a token your own logout had already invalidated.
    // Cross that boundary before signing out so the token is genuinely older.
    await new Promise((r) => setTimeout(r, 1100))

    await request(app).post(`${AUTH}/logout-all`).set('Authorization', `Bearer ${user.accessToken}`).expect(200)

    const res = await request(app).get(`${AUTH}/me`).set('Authorization', `Bearer ${user.accessToken}`)
    expect(res.status).toBe(401)
  })
})

describe('POST /refresh', () => {
  it('rotates the cookie and returns a fresh access token', async () => {
    const user = await createUser()
    const login = await request(app).post(`${AUTH}/login`).send({ email: user.email, password: VALID_PASSWORD })

    const res = await request(app)
      .post(`${AUTH}/refresh`)
      .set('Cookie', refreshCookie(login) as string)

    expect(res.status).toBe(200)
    expect(body(res).accessToken).toBeTruthy()
    expect(refreshCookie(res)).not.toBe(refreshCookie(login))
  })

  it('rejects a request with no cookie', async () => {
    const res = await request(app).post(`${AUTH}/refresh`)

    expect(res.status).toBe(401)
  })
})

describe('POST /logout', () => {
  it('clears the refresh cookie', async () => {
    const user = await createUser()
    const login = await request(app).post(`${AUTH}/login`).send({ email: user.email, password: VALID_PASSWORD })

    const res = await request(app)
      .post(`${AUTH}/logout`)
      .set('Cookie', refreshCookie(login) as string)

    expect(res.status).toBe(200)
    expect(refreshCookie(res)).toContain('Expires=Thu, 01 Jan 1970')
  })
})

describe('POST /forgot-password', () => {
  it('gives the same answer whether or not the address exists', async () => {
    const user = await createUser()

    const known = await request(app).post(`${AUTH}/forgot-password`).send({ email: user.email })
    const unknown = await request(app).post(`${AUTH}/forgot-password`).send({ email: 'nobody@example.com' })

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(body(known).message).toBe(body(unknown).message)
  })
})

describe('rate limiting', () => {
  it('cuts off repeated failed logins for one address', async () => {
    const user = await createUser()

    const attempt = () => request(app).post(`${AUTH}/login`).send({ email: user.email, password: 'WrongPassword9!' })

    let limited: request.Response | undefined

    // The per-email budget is 5 failures; the per-IP budget is 10. Either one
    // firing proves the limiter is mounted and counting.
    for (let i = 0; i < 8 && !limited; i++) {
      const res = await attempt()
      if (res.status === 429) limited = res
    }

    expect(limited?.status).toBe(429)
    expect(limited ? body(limited).message : undefined).toContain('Too many')
  })
})
