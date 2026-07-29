import { getDb } from 'db/client'
import { AppError } from 'shared/utils/errors/app-error'

import { createDMRoom, findDMRoom } from './room.repository'

export const findOrCreateDMRoomService = async (senderId: string, receiverId: string): Promise<string> => {
  try {
    return await getDb().transaction(async (tx) => {
      const existingRoomId = await findDMRoom(tx, senderId, receiverId)
      if (existingRoomId) return existingRoomId
      return await createDMRoom(tx, senderId, receiverId)
    })
  } catch (err) {
    console.error(err)
    throw new AppError('Failed to find or create DM room', 500)
  }
}
