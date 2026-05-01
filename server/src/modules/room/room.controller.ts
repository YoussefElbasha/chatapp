import type { NextFunction, Request, Response } from 'express'
import { findOrCreateDMRoomService } from 'modules/room/room.service'

export const findOrCreateDMRoomController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderId, receiverId } = req.body

    const roomId = await findOrCreateDMRoomService(senderId as string, receiverId as string)

    return res.status(200).json({ message: 'Success', roomId })
  } catch (err) {
    next(err)
  }
}
