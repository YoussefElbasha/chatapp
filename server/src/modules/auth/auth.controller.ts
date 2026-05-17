import { z } from 'zod'

import type { NextFunction, Request, Response } from 'express'
import { loginService, logoutAllService, logoutService, refreshTokenService, registerService } from './auth.service'
import { loginSchema, registerSchema } from './auth.schema'
import { REFRESH_TOKEN_COOKIE_OPTIONS } from 'shared/utils/cookie-options'
import { getUserByIdService } from 'modules/user/user.service'

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

    const { user, accessToken, refreshToken } = await registerService(parsed.data, meta)

    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS)

    return res.status(201).json({ message: 'Account created successfully', user, accessToken })
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
    const { refreshToken } = req.cookies

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
    const { refreshToken } = req.cookies

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
