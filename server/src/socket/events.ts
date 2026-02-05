import { randomUUID } from 'crypto'
import type { Server, Socket } from 'socket.io'

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket'

export const registerSocketEvents = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
): void => {
  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    void socket.join(roomId)
  })

  socket.on('room:leave', ({ roomId }: { roomId: string }) => {
    void socket.leave(roomId)
  })

  socket.on('message:send', ({ roomId, content }: { roomId: string; content: string }) => {
    const message = {
      roomId,
      messageId: randomUUID(),

      authorId: socket.data.userId,
      content,
      createdAt: new Date().toISOString(),
    }

    io.to(roomId).emit('message:new', message)
  })
}
