import type { PoolClient } from 'pg'

export const findDMRoom = async (
  client: PoolClient,
  senderId: string,
  receiverId: string
): Promise<string | null> => {
  const { rows } = await client.query<{ room_id: string }>(
    `SELECT r.id AS room_id
     FROM rooms r
     JOIN room_members rm1 ON rm1.room_id = r.id
     JOIN room_members rm2 ON r.id = rm2.room_id
     WHERE r.type = 'DM'
     AND rm1.user_id = $1
     AND rm2.user_id = $2`,
    [senderId, receiverId]
  )

  return rows.length > 0 ? rows[0].room_id : null
}

export const createDMRoom = async (
  client: PoolClient,
  senderId: string,
  receiverId: string
): Promise<string> => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO rooms (type, total_members) VALUES ('DM', 2) RETURNING id`
  )

  const roomId = rows[0].id

  await client.query(
    `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [roomId, senderId, receiverId]
  )

  return roomId
}