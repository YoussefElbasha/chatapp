import { type NextFunction, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { verifyAccessToken } from 'modules/auth/token.service'
import { AppError } from 'shared/utils/errors/app-error'

const readBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')

  if (scheme.toLowerCase() !== 'bearer') return null

  return token || null
}

export const authHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = readBearerToken(req.headers.authorization)

  if (!token) return next(new AppError('Unauthorized', 401))

  try {
    req.userId = verifyAccessToken(token).userId
    return next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(new AppError('Token expired', 401))
    if (err instanceof jwt.JsonWebTokenError) return next(new AppError('Unauthorized', 401))
    return next(err)
  }
}
