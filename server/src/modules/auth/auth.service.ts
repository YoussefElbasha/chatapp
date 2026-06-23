import bcrypt from 'bcrypt'
import { getDb } from 'db/client'
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserCredentialsById,
  updateLastLoginAt,
  updatePasswordHash,
} from 'modules/user/user.repository'
import { AppError } from 'shared/utils/errors/app-error'

import type { LoginDto, RegisterDto } from './auth.schema'
import { CreatedUser } from 'modules/user/user.types'
import { generateTokenPair, getRefreshSecret } from './token.service'
import { TokenPair } from './token.types'
import { deleteAllRefreshTokensByUserId, deleteRefreshTokenByHash, findRefreshTokenByHash } from './token.repository'
import { hashToken } from 'shared/utils/tokens'
import jwt from 'jsonwebtoken'
import { findRecentPasswordHistory, insertPasswordHistory, PasswordHistoryRow } from './password-history.repository'
import { sendPasswordChangedEmail } from 'shared/email/email.service'

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
      user = await getDb().transaction(async (tx) => {
        const created = await createUser({ email, username, discriminator, passwordHash, displayName }, tx)
        await insertPasswordHistory(created.id, passwordHash, tx)
        return created
      })
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

  void updateLastLoginAt(user.id).catch((e) => console.error('updateLastLoginAt failed:', e))

  const tokens = await generateTokenPair(user.id, meta)

  return { user: { id: user.id, email: user.email }, ...tokens }
}

export const logoutService = async (refreshToken: string) => {
  if (!refreshToken) return

  const tokenHash = hashToken(refreshToken)

  await deleteRefreshTokenByHash(tokenHash)
}

export const logoutAllService = async (userId: string) => {
  if (!userId) return

  await deleteAllRefreshTokensByUserId(userId)
}

export const changePasswordService = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await findUserCredentialsById(userId)

  if (!user) throw new AppError('User not found', 404)

  const isPasswordRight: boolean = await bcrypt.compare(oldPassword, user.password_hash)

  if (!isPasswordRight) throw new AppError("Old password doesn't match current password", 400)

  const passwordHistory: PasswordHistoryRow[] = await findRecentPasswordHistory(user.id, 5)

  for (const row of passwordHistory)
    if (await bcrypt.compare(newPassword, row.passwordHash))
      throw new AppError('This password has already been used before', 422)

  const newPasswordHash: string = await bcrypt.hash(newPassword, 12)

  await getDb().transaction(async (tx) => {
    await updatePasswordHash(user.id, newPasswordHash, tx)
    await insertPasswordHistory(user.id, newPasswordHash, tx)
    await deleteAllRefreshTokensByUserId(user.id, tx)
  })

  void sendPasswordChangedEmail(user.email).catch((e) =>
    console.error('password-change email failed:', e),
  )
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

  const tokenHash = hashToken(refreshToken)
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
