// src/socket/index.ts
import { Server } from 'socket.io'
import { Server as HttpServer } from 'http' // or https
// import { authMiddleware } from './middleware.js'
import { registerChatHandlers } from './handlers/chat.js'
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types.js'

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: 'http://localhost:3000', // Your React/Next.js Client
      methods: ['GET', 'POST'],
    },
  })

  // Apply Auth
  // io.use(authMiddleware)

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.username} (${socket.id})`)

    // Join a personal room for "User Specific" notifications (Friend requests, DM notifications)
    socket.join(`user_${socket.data.userId}`)

    // Register handlers
    registerChatHandlers(io, socket)

    socket.on('disconnect', () => {
      console.log('User disconnected')
    })
  })

  return io
}
