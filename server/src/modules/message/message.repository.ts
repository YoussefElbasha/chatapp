import { getDb } from 'db/client'
import { messages } from 'db/schema'

import type { Embed, MessageDb } from './message.db'

export const insertMessage = async (
  roomId: string,
  userId: string,
  content: string,
  embedsJson: string | null,
): Promise<MessageDb> => {
  const embeds = embedsJson ? (JSON.parse(embedsJson) as Embed[]) : null

  const rows = await getDb()
    .insert(messages)
    .values({ roomId, userId, content, embeds })
    .returning({
      id: messages.id,
      room_id: messages.roomId,
      user_id: messages.userId,
      content: messages.content,
      embeds: messages.embeds,
      is_edited: messages.isEdited,
      is_deleted: messages.isDeleted,
      created_at: messages.createdAt,
    })

  const row = rows[0]
  return {
    ...row,
    id: String(row.id),
    embeds: row.embeds as Embed[] | null,
  }
}
