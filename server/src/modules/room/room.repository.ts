import { getDb } from 'db/client'
import type * as schema from 'db/schema'
import { roomMembers, rooms } from 'db/schema'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { alias } from 'drizzle-orm/pg-core'

type Tx = NodePgDatabase<typeof schema>

export const isRoomMember = async (userId: string, roomId: string, db: Tx = getDb()): Promise<boolean> => {
  const rows = await db
    .select({ userId: roomMembers.userId })
    .from(roomMembers)
    .where(and(eq(roomMembers.userId, userId), eq(roomMembers.roomId, roomId)))
    .limit(1)

  return rows.length > 0
}

export const findDMRoom = async (tx: Tx, senderId: string, receiverId: string): Promise<string | null> => {
  const rm1 = alias(roomMembers, 'rm1')
  const rm2 = alias(roomMembers, 'rm2')

  const rows = await tx
    .select({ id: rooms.id })
    .from(rooms)
    .innerJoin(rm1, eq(rm1.roomId, rooms.id))
    .innerJoin(rm2, eq(rm2.roomId, rooms.id))
    .where(and(eq(rooms.type, 'DM'), eq(rm1.userId, senderId), eq(rm2.userId, receiverId)))
    .limit(1)

  return rows[0]?.id ?? null
}

export const createDMRoom = async (tx: Tx, senderId: string, receiverId: string): Promise<string> => {
  const [room] = await tx.insert(rooms).values({ type: 'DM', totalMembers: 2 }).returning({ id: rooms.id })

  await tx.insert(roomMembers).values([
    { roomId: room.id, userId: senderId },
    { roomId: room.id, userId: receiverId },
  ])

  return room.id
}
