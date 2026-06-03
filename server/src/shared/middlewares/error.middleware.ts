import type { NextFunction, Request, Response } from 'express'
import { AppError } from 'shared/utils/errors/app-error'

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)

  if (err instanceof AppError) {
    const body: { message: string; code?: string } = { message: err.message }
    if (err.code) body.code = err.code
    return res.status(err.statusCode).json(body)
  }

  return res.status(500).json({
    message: 'Internal server error',
  })
}
