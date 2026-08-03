import app from 'app'
import { env } from 'config/env'
import { createServer } from 'http'
import { cleanupExpiredTokens } from 'modules/auth/cleanup'
import cron from 'node-cron'
import { logger } from 'shared/logger/logger'
import { initSocket } from 'shared/socket/index.js'

const httpServer = createServer(app)

initSocket(httpServer)

cron.schedule('0 3 * * *', () => {
  cleanupExpiredTokens()
    .then(({ tokens, refreshTokens }) => logger.info({ tokens, refreshTokens }, 'expired token cleanup finished'))
    .catch((err: unknown) => logger.error({ err }, 'expired token cleanup failed'))
})

httpServer.listen(env.PORT, (): void => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server started')
})
