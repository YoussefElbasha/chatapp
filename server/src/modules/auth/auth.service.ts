import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { createUser, findUserByEmail } from 'modules/user/user.repository'
import { AppError } from 'shared/utils/errors/app-error'

import type { LoginDto, RegisterDto } from './auth.schema'
import { CreatedUser } from 'modules/user/user.types'
import { generateTokenPair, getRefreshSecret } from './token.service'
import { TokenPair } from './token.types'
import { deleteAllRefreshTokensByUserId, deleteRefreshTokenByHash, findRefreshTokenByHash } from './token.repository'
import jwt from 'jsonwebtoken'

const DUMMY_BCRYPT_HASH = '$2b$12$fE35fVzqo6vVxL0FpaB7GO8dlVZWpALxLJHUTJJPIFmU0Hjfg89nW'

const MAX_DISCRIMINATOR_ATTEMPTS = 5

export const registerService = async (
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ user: CreatedUser } & TokenPair> => {
  const { email, password, username, displayName } = dto

  const alreadyExists = await findUserByEmail(email)
  if (alreadyExists) throw new AppError('Invalid email or username or password', 400)

  const passwordHash = await bcrypt.hash(password, 12)

  let user: CreatedUser | null = null

  for (let attempt = 0; attempt < MAX_DISCRIMINATOR_ATTEMPTS; attempt++) {
    const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, '0')

    try {
      user = await createUser({ email, username, discriminator, passwordHash, displayName })
      break
    } catch (err: any) {
      if (err.message === 'DISCRIMINATOR_TAKEN' || err.message === 'EMAIL_TAKEN') continue
      throw err
    }
  }

  if (!user) throw new AppError('Invalid email or username or password', 400)

  const tokens = await generateTokenPair(user.id, meta)

  return { user, ...tokens }
}

export const loginService = async (
  dto: LoginDto,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ user: { id: string; email: string } } & TokenPair> => {
  const user = await findUserByEmail(dto.email)

  const passwordHash = user?.password_hash ?? DUMMY_BCRYPT_HASH
  const isValid = await bcrypt.compare(dto.password, passwordHash)

  if (!user || !isValid) throw new AppError('Invalid email or username or password', 401)
  if (!user.is_active) throw new AppError('Invalid email or username or password', 401)
  // if (!user.email_verified) throw new AppError('Email not verified', 403)

  const tokens = await generateTokenPair(user.id, meta)

  return { user: { id: user.id, email: user.email }, ...tokens }
}

export const logoutService = async (refreshToken: string) => {
  if (!refreshToken) return

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

  await deleteRefreshTokenByHash(tokenHash)
}

export const logoutAllService = async (userId: string) => {
  if (!userId) return

  await deleteAllRefreshTokensByUserId(userId)
}

export const refreshTokenService = async (
  refreshToken: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<TokenPair> => {
  if (!refreshToken) throw new AppError('Unauthorized', 401)

  let verified: { userId: string }
  try {
    verified = jwt.verify(refreshToken, getRefreshSecret()) as { userId: string }
  } catch {
    throw new AppError('Unauthorized', 401)
  }

  if (!verified?.userId) throw new AppError('Unauthorized', 401)

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

  const existingToken = await findRefreshTokenByHash(tokenHash)

  if (!existingToken) {
    await deleteAllRefreshTokensByUserId(verified.userId)
    throw new AppError('Unauthorized', 401)
  }

  if (existingToken.expiresAt < new Date()) {
    await deleteRefreshTokenByHash(tokenHash)
    throw new AppError('Unauthorized', 401)
  }

  await deleteRefreshTokenByHash(tokenHash)

  return generateTokenPair(existingToken.userId, meta)
}
