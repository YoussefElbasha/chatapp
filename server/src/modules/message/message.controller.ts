import type { NextFunction, Request, Response } from 'express'
import { createMessageService } from 'modules/message/message.service'

export const createMessageController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId, userId, content, embeds } = req.body

    const message = await createMessageService({ roomId, userId, content, embeds })

    return res.status(201).json({ message: 'Success', msg: message })
  } catch (err) {
    next(err)
  }
}
