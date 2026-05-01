import type { NextFunction, Request, Response } from 'express'
import { deleteUserService, getUserByIdService, getUsersService } from 'modules/user/user.service'
import { AppError } from 'shared/utils/errors/app-error'

export const getUserByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    if (!id) {
      return next(new AppError('User ID is required', 400))
    }

    const user = await getUserByIdService(id as string)

    return res.status(200).json({ message: 'Success', user })
  } catch (err) {
    next(err)
  }
}

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsersService()

    return res.status(200).json({ message: 'Success', users })
  } catch (err) {
    next(err)
  }
}

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    if (!id) {
      return next(new AppError('User ID is required', 400))
    }

    await deleteUserService(id as string)

    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}
