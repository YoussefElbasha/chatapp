export interface ServerToClientEvents {
  'message:new': (payload: {
    roomId: string
    messageId: string
    authorId: string
    content: string
    createdAt: string
  }) => void
}

export interface ClientToServerEvents {
  'room:join': (payload: { roomId: string }) => void
  'room:leave': (payload: { roomId: string }) => void
  'message:send': (payload: { roomId: string; content: string }) => void
}

export interface SocketData {
  userId: string
}
