import dotenv from 'dotenv'
dotenv.config() // ✅ first thing
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import { createServer } from 'http'
import { errorHandler } from 'shared/middlewares/error.middleware.js'

import messageRoutes from 'modules/message/message.routes'
import roomRoutes from 'modules/room/room.routes'
import userRoutes from 'modules/user/user.routes'
import authRoutes from 'modules/auth/auth.routes'
import { initSocket } from 'shared/socket/index.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.use(helmet())
app.use(cors())
app.use(cookieParser())
app.use(express.json())

app.use('/api/v1/users', userRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/messages', messageRoutes)
app.use('/api/v1/auth', authRoutes)

app.use(errorHandler)

app.get('/', (req: Request, res: Response): void => {
  res.json({ message: 'Welcome to the Express + TypeScript Backend!' })
})

app.get('/health', (req: Request, res: Response): void => {
  res.status(200).send('OK')
})

const httpServer = createServer(app)

initSocket(httpServer)

httpServer.listen(PORT, (): void => {
  console.log(`Server running on http://localhost:${PORT}`)
})
