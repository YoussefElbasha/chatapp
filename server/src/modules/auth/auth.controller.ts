import type { NextFunction, Request, Response } from 'express'
import { getUserByIdService } from 'modules/user/user.service'
import { REFRESH_TOKEN_COOKIE_OPTIONS } from 'shared/utils/cookie-options'
import { z } from 'zod'

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema'
import {
  changePasswordService,
  forgotPasswordService,
  loginService,
  logoutAllService,
  logoutService,
  refreshTokenService,
  registerService,
  resendVerificationService,
  resetPasswordService,
  verifyEmailService,
} from './auth.service'

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: z.treeifyError(parsed.error) })
    }

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    // No session is handed back here — the account cannot be used until the address
    // is confirmed, so the client's next screen is "check your inbox", not the app.
    const { user } = await registerService(parsed.data, meta)

    return res.status(201).json({ message: 'Account created. Check your email to verify your address.', user })
  } catch (err) {
    return next(err)
  }
}

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: z.treeifyError(parsed.error) })
    }

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    const { user, accessToken, refreshToken } = await loginService(parsed.data, meta)

    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(200).json({ message: 'Login successful', user, accessToken })
  } catch (err) {
    return next(err)
  }
}

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies as { refreshToken?: string }

    if (refreshToken) {
      await logoutService(refreshToken)
    }

    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(200).json({ message: 'Logged out successfully' })
  } catch (err) {
    return next(err)
  }
}

export const logoutAllController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      await logoutAllService(req.userId)
    }

    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(200).json({ message: 'Logged out from all devices successfully' })
  } catch (err) {
    return next(err)
  }
}

export const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: z.treeifyError(parsed.error) })
    }

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    await forgotPasswordService(parsed.data.email, meta)

    return res
      .status(200)
      .json({ message: 'If an account exists for that email, a password reset link has been sent.' })
  } catch (err) {
    return next(err)
  }
}

export const resetPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)

    if (!parsed.success) return res.status(400).json({ message: 'Invalid or missing fields like token or password' })

    await resetPasswordService(parsed.data)

    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(200).json({ message: 'Password reset successfully' })
  } catch (err) {
    return next(err)
  }
}

export const verifyEmailController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body)

    if (!parsed.success) return res.status(400).json({ message: 'Invalid or missing token' })

    await verifyEmailService(parsed.data.token)

    return res.status(200).json({ message: 'Email verified successfully' })
  } catch (err) {
    return next(err)
  }
}

export const resendVerificationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: z.treeifyError(parsed.error) })
    }

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    await resendVerificationService(parsed.data.email, meta)

    return res
      .status(200)
      .json({ message: 'If that account exists and is unverified, a new verification link has been sent.' })
  } catch (err) {
    return next(err)
  }
}

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await getUserByIdService(req.userId)

    return res.status(200).json({ message: 'User retrieved successfully', user })
  } catch (err) {
    return next(err)
  }
}

export const refreshTokenController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies as { refreshToken?: string }

    if (!refreshToken) return res.status(401).json({ message: 'Unauthorized' })

    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshTokenService(refreshToken, meta)

    res.cookie('refreshToken', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(200).json({ accessToken })
  } catch (err) {
    return next(err)
  }
}

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    const parsed = changePasswordSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: z.treeifyError(parsed.error) })
    }

    await changePasswordService(req.userId, parsed.data)

    res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS)
    return res.status(200).json({ message: 'Password changed successfully' })
  } catch (err) {
    return next(err)
  }
}
