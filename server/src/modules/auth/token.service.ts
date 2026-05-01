import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { insertRefreshToken } from './token.repository'
import type { TokenPair, InsertRefreshTokenDto } from './token.types'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '30d'
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined')
  return secret
}

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined')
  return secret
}

export const generateTokenPair = async (
  userId: string,
  dto?: Pick<InsertRefreshTokenDto, 'ipAddress' | 'userAgent'>,
): Promise<TokenPair> => {
  const accessToken = jwt.sign({ userId }, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY })

  const refreshToken = jwt.sign({ userId }, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY })

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

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
