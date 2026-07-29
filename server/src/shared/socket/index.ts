import type { Server as HttpServer } from 'http'
import { verifyAccessToken } from 'modules/auth/token.service'
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from 'shared/types/socket'
import { socketCorsOptions } from 'shared/utils/cors-options'
import { Server } from 'socket.io'

import { registerSocketEvents } from './events'

type ChatServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export const initSocket = (httpServer: HttpServer): ChatServer => {
  const io: ChatServer = new Server(httpServer, { cors: socketCorsOptions })

  io.use((socket, next) => {
    const { token } = socket.handshake.auth as { token?: unknown }

    if (typeof token !== 'string' || !token) {
      next(new Error('Unauthorized'))
      return
    }

    try {
      socket.data.userId = verifyAccessToken(token).userId
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    void socket.join(`user:${socket.data.userId}`)

    registerSocketEvents(io, socket)
  })

  return io
}
