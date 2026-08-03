// Counters live in this process's memory. That means they reset on every restart
// and are not shared between instances, so every limit below is effectively
// multiplied by the number of instances running. Until a shared store is wired up,
// this API must be deployed single-instance for these numbers to mean anything.
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
  /** Only charge the budget for requests that failed. */
  countFailuresOnly?: boolean
}

const createLimiter = ({ windowMs, limit, message, countBy = byIp, countFailuresOnly = false }: LimiterConfig) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: countBy,
    skipSuccessfulRequests: countFailuresOnly,
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

export const resendVerificationIpLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: TOO_MANY_REQUESTS,
})

// Keyed on an email the caller supplies, which means anyone can aim it at anyone.
// Charging only the failures keeps the brute-force ceiling while making sure the
// real owner — who gets the password right — can never be locked out by a stranger
// burning their budget.
export const loginEmailLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  countBy: byEmail,
  countFailuresOnly: true,
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

// Unlike login there is no "success" to skip here — every well-formed request sends
// mail — so a stranger can spend someone else's hourly budget and delay their
// password recovery. Accepted: the cap on unsolicited mail to a real inbox matters
// more, and the worst case is a wait rather than a lockout.
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
