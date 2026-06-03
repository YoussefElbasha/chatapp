import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import type { Request } from 'express'

const emailKeyGenerator = (req: Request, _res: unknown): string => {
  const raw = (req.body as { email?: unknown })?.email
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (normalized) return `email:${normalized}`
  }
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

export const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  message: { message: 'Too many login attempts for this account, please try again later' },
})

export const registerEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  message: { message: 'Too many signup attempts for this email, please try again later' },
})

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  message: { message: 'Too many verification emails for this account, please try again later' },
})

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  message: { message: 'Too many password reset requests for this account, please try again later' },
})

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

const userIdKeyGenerator = (req: Request, _res: unknown): string => {
  const userId = (req as Request & { userId?: string }).userId
  if (userId) return `user:${userId}`
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

export const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: userIdKeyGenerator,
  message: { message: 'Too many password change attempts, please try again later' },
})
