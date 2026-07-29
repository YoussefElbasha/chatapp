import { env } from 'config/env'
import crypto from 'crypto'
import { getDb } from 'db/client'
import jwt from 'jsonwebtoken'
import { generateOpaqueToken, hashToken } from 'shared/utils/tokens'

import { insertOneTimeToken, insertRefreshToken } from './token.repository'
import type { InsertRefreshTokenDto, TokenPair } from './token.types'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
const RESET_PASSWORD_TOKEN_EXPIRY_MS = 60 * 60 * 1000

export const verifyAccessToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId?: unknown }

  if (typeof payload.userId !== 'string' || !payload.userId) {
    throw new jwt.JsonWebTokenError('Token is missing a user id')
  }

  return { userId: payload.userId }
}

export const verifyRefreshToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId?: unknown }

  if (typeof payload.userId !== 'string' || !payload.userId) {
    throw new jwt.JsonWebTokenError('Token is missing a user id')
  }

  return { userId: payload.userId }
}

export const generateTokenPair = async (
  userId: string,
  dto?: Pick<InsertRefreshTokenDto, 'ipAddress' | 'userAgent'>,
): Promise<TokenPair> => {
  const accessToken = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })

  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    jwtid: crypto.randomUUID(),
  })

  const tokenHash = hashToken(refreshToken)

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)

  await insertRefreshToken({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: dto?.ipAddress,
    userAgent: dto?.userAgent,
  })

  return { accessToken, refreshToken }
}

export const generatePasswordResetToken = async (
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
  db: ReturnType<typeof getDb> = getDb(),
) => {
  const token = generateOpaqueToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRY_MS)

  await insertOneTimeToken(
    {
      userId,
      tokenHash,
      type: 'password_reset',
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
    db,
  )

  return token
}
