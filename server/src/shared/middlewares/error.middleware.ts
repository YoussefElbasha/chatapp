import type { NextFunction, Request, Response } from 'express'
import { AppError } from 'shared/utils/errors/app-error'

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  res.status(500).json({
    message: 'Internal server error',
  })
}
