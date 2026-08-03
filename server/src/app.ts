// Loads and validates .env before anything else reads it. Keep this import first.
import { env } from 'config/env'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import authRoutes from 'modules/auth/auth.routes'
import messageRoutes from 'modules/message/message.routes'
import roomRoutes from 'modules/room/room.routes'
import userRoutes from 'modules/user/user.routes'
import { pinoHttp } from 'pino-http'
import { logger } from 'shared/logger/logger'
import { errorHandler } from 'shared/middlewares/error.middleware.js'
import { corsOptions } from 'shared/utils/cors-options'

// Everything that makes up the API, and nothing that binds a port or starts a
// timer. Keeping those in server.ts is what lets a test import the app, mount it
// on an ephemeral port and exercise the middleware stack — the layer where
// cookies, rate limits and the error handler actually live.
export const app = express()

// When we sit behind a proxy (nginx, Render, Fly, Cloudflare...), the caller's
// real address arrives in the X-Forwarded-For header instead of the socket.
// TRUST_PROXY = how many proxies are in front of us. 0 means none.
//
// Get this wrong and every rate limiter breaks: too low and everyone shares the
// proxy's address (one budget for the whole world), too high and a caller can
// fake the header to get a fresh budget whenever they like.
app.set('trust proxy', env.TRUST_PROXY)

app.use(helmet())
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json())

app.use(pinoHttp({ logger }))

app.get('/', (_req: Request, res: Response): void => {
  res.json({ message: 'Welcome to the Express + TypeScript Backend!' })
})

app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

app.use('/api/v1/users', userRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/messages', messageRoutes)
app.use('/api/v1/auth', authRoutes)

app.use(errorHandler)

export default app
