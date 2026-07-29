// modules/message/message.service.ts
import { mapMessageDbToMessage } from './message.mapper'
import { insertMessage } from './message.repository'
import type { CreateMessageDTO, Message } from './message.types'

export const createMessageService = async ({ roomId, userId, content, embeds }: CreateMessageDTO): Promise<Message> => {
  const embedsJson = embeds && embeds.length > 0 ? JSON.stringify(embeds) : null

  const row = await insertMessage(roomId, userId, content, embedsJson)

  return mapMessageDbToMessage(row)
}
