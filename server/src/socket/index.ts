import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket'
import { registerSocketEvents } from './events'

export const initSocket = (
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: '*',
    },
  })

  io.use((socket, next) => {
    const { userId } = socket.handshake.auth

    if (typeof userId !== 'string') {
      next(new Error('Unauthorized'))
      return
    }

    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string

    void socket.join(`user:${userId}`)

    registerSocketEvents(io, socket)
  })

  return io
}
