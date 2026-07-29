import type { NextFunction, Request, Response } from 'express'
import { findOrCreateDMRoomService } from 'modules/room/room.service'

export const findOrCreateDMRoomController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: senderId is taken from the caller's own request body, so anyone can
    // open a DM room on someone else's behalf. Should come from req.userId.
    const { senderId, receiverId } = req.body as { senderId: string; receiverId: string }

    const roomId = await findOrCreateDMRoomService(senderId, receiverId)

    return res.status(200).json({ message: 'Success', roomId })
  } catch (err) {
    next(err)
  }
}
