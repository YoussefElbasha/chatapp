import { isProduction } from 'config/env'

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
}
