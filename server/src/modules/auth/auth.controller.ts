import { z } from 'zod'

import type { NextFunction, Request, Response } from 'express'
import { loginService, registerService } from './auth.service'
import { loginSchema, registerSchema } from './auth.schema'
import { REFRESH_TOKEN_COOKIE_OPTIONS } from 'shared/utils/cookie-options'
//import { loginService } from 'modules/auth/auth.service'

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
    next(err)
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
    next(err)
  }
}
