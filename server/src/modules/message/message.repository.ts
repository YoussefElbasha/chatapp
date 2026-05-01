// modules/message/message.repository.ts
import { getPool } from 'db/pool'

import type { MessageDb } from './message.db'

export const insertMessage = async (
  roomId: string,
  userId: string,
  content: string,
  embedsJson: string | null
): Promise<MessageDb> => {
  const pool = getPool()

  const { rows } = await pool.query<MessageDb>(
    `INSERT INTO messages (room_id, user_id, content, embeds)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [roomId, userId, content, embedsJson]
  )

  return rows[0]
}