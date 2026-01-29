// src/socket/types.ts

export interface ServerToClientEvents {
  receive_message: (message: MessagePayload) => void
  user_joined: (userId: string) => void
  user_left: (userId: string) => void
  error: (err: { message: string }) => void
}

export interface ClientToServerEvents {
  join_room: (roomId: string, callback: (response: Response) => void) => void
  send_message: (
    data: MessageInput,
    callback: (response: Response) => void,
  ) => void
  leave_room: (roomId: string) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string
  username: string
}

// Helper types
type Response = { status: 'ok' } | { status: 'error'; message: string }

type MessagePayload = {
  id: string
  content: string
  senderId: string
  roomId: string
  createdAt: string
}

type MessageInput = {
  roomId: string // The channel ID or DM ID
  content: string
}
