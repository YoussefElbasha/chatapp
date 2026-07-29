import type { NextFunction, Request, Response } from 'express'
import { logger } from 'shared/logger/logger'
import { AppError } from 'shared/utils/errors/app-error'

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, code: err.code, path: req.path, userId: req.userId },
      `handled error: ${err.message}`,
    )

    const body: { message: string; code?: string } = { message: err.message }
    if (err.code) body.code = err.code

    return res.status(err.statusCode).json(body)
  }

  logger.error({ err, path: req.path, userId: req.userId }, 'unhandled error')

  return res.status(500).json({ message: 'Internal server error' })
}
