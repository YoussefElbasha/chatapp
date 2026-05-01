import { z } from 'zod'

import type { NextFunction, Request, Response } from 'express'
import { registerService } from './auth.service'
import { registerSchema } from './auth.schema'
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

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    })

    return res.status(201).json({ message: 'Account created successfully', user, accessToken })
  } catch (err) {
    next(err)
  }
}

// export const loginController = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { email, password }: { email: string; password: string } = req.body
//     const { id } = await loginService(email, password)

//   } catch (err) {
//     next(err)
//   }
// }
