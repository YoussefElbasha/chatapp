import type { MessageDb } from './message.db'
import type { Message } from './message.types'

export const mapMessageDbToMessage = (row: MessageDb): Message => ({
  id: row.id,
  roomId: row.room_id,
  userId: row.user_id,
  content: row.content,
  embeds: row.embeds,
  isEdited: row.is_edited,
  isDeleted: row.is_deleted,
  createdAt: row.created_at,
})
