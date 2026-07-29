import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const byIp = (req: Request): string => `ip:${ipKeyGenerator(req.ip ?? '')}`

const byEmail = (req: Request): string => {
  const raw = (req.body as { email?: unknown } | undefined)?.email

  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (normalized) return `email:${normalized}`
  }

  return byIp(req)
}

const byUserId = (req: Request): string => {
  const { userId } = req as Request & { userId?: string }
  return userId ? `user:${userId}` : byIp(req)
}

type LimiterConfig = {
  /** How long the counting window lasts. */
  windowMs: number
  /** How many requests are allowed inside that window. */
  limit: number
  /** What the user sees once they run out. */
  message: string
  /** How to group requests. Defaults to counting per IP address. */
  countBy?: (req: Request) => string
}

const createLimiter = ({ windowMs, limit, message, countBy = byIp }: LimiterConfig) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: countBy,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  })

const TOO_MANY_REQUESTS = 'Too many requests, please try again later'

export const registerIpLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: TOO_MANY_REQUESTS })

export const loginIpLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: TOO_MANY_REQUESTS })

export const forgotPasswordIpLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: TOO_MANY_REQUESTS })

export const resetPasswordIpLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: TOO_MANY_REQUESTS })

export const refreshLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 60, message: TOO_MANY_REQUESTS })

export const verifyEmailLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: TOO_MANY_REQUESTS })

export const loginEmailLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  countBy: byEmail,
  message: 'Too many login attempts for this account, please try again later',
})

export const registerEmailLimiter = createLimiter({
  windowMs: 1 * HOUR,
  limit: 3,
  countBy: byEmail,
  message: 'Too many signup attempts for this email, please try again later',
})

export const resendVerificationLimiter = createLimiter({
  windowMs: 1 * HOUR,
  limit: 3,
  countBy: byEmail,
  message: 'Too many verification emails for this account, please try again later',
})

export const forgotPasswordEmailLimiter = createLimiter({
  windowMs: 1 * HOUR,
  limit: 3,
  countBy: byEmail,
  message: 'Too many password reset requests for this account, please try again later',
})

export const changePasswordLimiter = createLimiter({
  windowMs: 1 * HOUR,
  limit: 5,
  countBy: byUserId,
  message: 'Too many password change attempts, please try again later',
})
