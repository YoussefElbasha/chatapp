export interface Embed {
  type: string
  url: string
  title?: string
  description?: string
  [key: string]: unknown
}

export interface CreateMessageDTO {
  roomId: string
  userId: string
  content: string
  embeds?: Embed[] | null
}

export interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  embeds?: Embed[] | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: Date
}
