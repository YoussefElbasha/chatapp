import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from 'shared/utils/errors/app-error'

export const authHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401)
  }

  const token = authHeader.split(' ')[1]

  if (!token) throw new AppError('Unauthorized', 401)

  try {
    const secret = process.env.JWT_ACCESS_SECRET

    if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined')

    const payload = jwt.verify(token, secret) as { userId: string }

    req.userId = payload.userId

    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AppError('Token expired', 401)
  }
}
