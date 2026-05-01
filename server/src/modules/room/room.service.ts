// modules/room/room.service.ts
import { getPool } from 'db/pool'
import { AppError } from 'shared/utils/errors/app-error'

import { createDMRoom, findDMRoom } from './room.repository'

export const findOrCreateDMRoomService = async (senderId: string, receiverId: string): Promise<string> => {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existingRoomId = await findDMRoom(client, senderId, receiverId)

    if (existingRoomId) {
      await client.query('COMMIT')
      return existingRoomId
    }

    const newRoomId = await createDMRoom(client, senderId, receiverId)

    await client.query('COMMIT')
    return newRoomId
  } catch (err) {
    await client.query('ROLLBACK') // ← you were missing this by the way
    console.error(err)
    throw new AppError('Failed to find or create DM room', 500)
  } finally {
    client.release()
  }
}
