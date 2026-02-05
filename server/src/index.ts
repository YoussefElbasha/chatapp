import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import helmet from 'helmet'
import { createServer } from 'http'

import { initSocket } from './socket/index.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 5000


app.use(helmet())
app.use(cors())
app.use(express.json())


app.get('/', (req: Request, res: Response): void => {
  res.json({ message: 'Welcome to the Express + TypeScript Backend!' })
})

app.get('/health', (req: Request, res: Response): void => {
  res.status(200).send('OK')
})


const httpServer = createServer(app)


initSocket(httpServer)


httpServer.listen(PORT, (): void => {

  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`)
})
