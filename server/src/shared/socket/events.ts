import { randomUUID } from 'crypto'
import { isRoomMember } from 'modules/room/room.repository'
import { logger } from 'shared/logger/logger'
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from 'shared/types/socket'
import type { Server, Socket } from 'socket.io'

type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export const registerSocketEvents = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: ChatSocket,
): void => {
  const withRoomAccess = (roomId: string, handler: () => void | Promise<void>) => {
    void (async () => {
      try {
        if (!(await isRoomMember(socket.data.userId, roomId))) {
          socket.emit('socket:error', { event: 'room', message: 'You are not a member of this room' })
          return
        }

        await handler()
      } catch (err) {
        logger.error({ err, userId: socket.data.userId, roomId }, 'socket handler failed')
        socket.emit('socket:error', { event: 'room', message: 'Something went wrong' })
      }
    })()
  }

  socket.on('room:join', ({ roomId }) => {
    withRoomAccess(roomId, () => {
      void socket.join(roomId)
    })
  })

  socket.on('room:leave', ({ roomId }) => {
    void socket.leave(roomId)
  })

  socket.on('message:send', ({ roomId, content }) => {
    withRoomAccess(roomId, () => {
      io.to(roomId).emit('message:new', {
        roomId,
        messageId: randomUUID(),
        authorId: socket.data.userId,
        content,
        createdAt: new Date().toISOString(),
      })
    })
  })
}
