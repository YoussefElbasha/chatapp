import { env, isProduction } from 'config/env'
import { pino } from 'pino'

/**
 * The application logger.
 *
 * In production it writes one JSON object per line, which log tools can search.
 * In development it prints colourful readable lines instead.
 *
 * `redact` is the important part: these fields are blanked out before anything
 * is written, so a password or token can never end up sitting in a log file.
 */
export const logger = pino({
  level: env.LOG_LEVEL,

  redact: {
    paths: [
      'password',
      'newPassword',
      'oldPassword',
      'token',
      'accessToken',
      'refreshToken',
      'passwordHash',
      'password_hash',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.newPassword',
      '*.oldPassword',
      '*.token',
    ],
    censor: '[redacted]',
  },

  transport: isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true } },
})
