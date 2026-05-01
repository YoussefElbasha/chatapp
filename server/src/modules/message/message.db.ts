export interface Embed {
  type: string
  url: string
  title?: string
  description?: string
  [key: string]: unknown
}

export interface MessageDb {
  id: string
  room_id: string
  user_id: string
  content: string
  embeds: Embed[] | null
  is_edited: boolean
  is_deleted: boolean
  created_at: Date
}
