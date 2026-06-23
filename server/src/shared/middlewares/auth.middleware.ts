import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from 'shared/utils/errors/app-error'

export const authHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('bearer '))) {
    throw new AppError('Unauthorized', 401)
  }

  const token = authHeader.split(' ')[1]

  if (!token) throw new AppError('Unauthorized', 401)

  const secret = process.env.JWT_ACCESS_SECRET

  if (!secret) throw new AppError('Internal Server Error', 500)

  try {
    const payload = jwt.verify(token, secret) as { userId: string }

    req.userId = payload.userId

    return next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(new AppError('Token expired', 401))
    if (err instanceof jwt.JsonWebTokenError) return next(new AppError('Unauthorized', 401))
    return next(err)
  }
}
