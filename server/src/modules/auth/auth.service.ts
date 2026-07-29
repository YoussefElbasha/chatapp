import bcrypt from 'bcrypt'
import { getDb } from 'db/client'
import { UserConflictError } from 'modules/user/user.errors'
import {
  createUser,
  findUserByEmail,
  findUserCredentialsById,
  updateLastLoginAt,
  updatePasswordHash,
} from 'modules/user/user.repository'
import { type CreatedUser } from 'modules/user/user.types'
import { getAppUrl } from 'shared/email/client'
import { sendPasswordChangedEmail, sendPasswordResetEmail } from 'shared/email/email.service'
import { audit } from 'shared/logger/audit'
import { logger } from 'shared/logger/logger'
import { AppError } from 'shared/utils/errors/app-error'
import { hashToken } from 'shared/utils/tokens'

import type { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.schema'
import {
  findRecentPasswordHistory,
  insertPasswordHistory,
  type PasswordHistoryRow,
} from './password-history.repository'
import {
  consumeOneTimeToken,
  deleteAllRefreshTokensByUserId,
  deleteRefreshTokenByHash,
  findRefreshTokenByHash,
  findValidOneTimeTokenByHash,
  markPendingTokensUsed,
} from './token.repository'
import { generatePasswordResetToken, generateTokenPair, verifyRefreshToken } from './token.service'
import { type TokenPair } from './token.types'

const DUMMY_BCRYPT_HASH = '$2b$12$fE35fVzqo6vVxL0FpaB7GO8dlVZWpALxLJHUTJJPIFmU0Hjfg89nW'

const MAX_DISCRIMINATOR_ATTEMPTS = 5

const PASSWORD_RESET_TOKEN = 'password_reset'

const BCRYPT_COST = 12

const PASSWORD_HISTORY_DEPTH = 5

const assertPasswordIsNew = async (userId: string, newPassword: string): Promise<void> => {
  const history: PasswordHistoryRow[] = await findRecentPasswordHistory(userId, PASSWORD_HISTORY_DEPTH)

  for (const previous of history) {
    if (await bcrypt.compare(newPassword, previous.passwordHash)) {
      throw new AppError('This password has already been used before', 422)
    }
  }
}

const savePasswordAndSignOutEverywhere = async (
  userId: string,
  passwordHash: string,
  tx: ReturnType<typeof getDb>,
): Promise<void> => {
  await updatePasswordHash(userId, passwordHash, tx)
  await insertPasswordHistory(userId, passwordHash, tx)
  await deleteAllRefreshTokensByUserId(userId, tx)
}

export const registerService = async (
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ user: CreatedUser } & TokenPair> => {
  const { email, password, username, displayName } = dto

  const alreadyExists = await findUserByEmail(email)
  if (alreadyExists) throw new AppError('Invalid email or username or password', 400)

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

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
    } catch (err: unknown) {
      if (!(err instanceof UserConflictError)) throw err

      if (err.reason === 'discriminator_taken') continue

      break
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

  if (!user || !isValid || !user.is_active) {
    const reason = !user ? 'unknown_email' : !isValid ? 'wrong_password' : 'inactive_account'

    audit('login.failed', { userId: user?.id, email: dto.email, reason, ...meta })
    throw new AppError('Invalid email or username or password', 401)
  }

  void updateLastLoginAt(user.id).catch((e: unknown) => logger.error({ err: e }, 'updateLastLoginAt failed'))

  const tokens = await generateTokenPair(user.id, meta)

  audit('login.succeeded', { userId: user.id, email: user.email, ...meta })

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

  audit('logout.all', { userId })
}

export const changePasswordService = async (userId: string, dto: ChangePasswordDto) => {
  const { oldPassword, newPassword } = dto

  const user = await findUserCredentialsById(userId)

  if (!user) throw new AppError('User not found', 404)
  if (!user.is_active) throw new AppError('Unauthorized', 401)

  const oldPasswordMatches = await bcrypt.compare(oldPassword, user.password_hash)

  if (!oldPasswordMatches) throw new AppError("Old password doesn't match current password", 400)

  await assertPasswordIsNew(user.id, newPassword)

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_COST)

  await getDb().transaction((tx) => savePasswordAndSignOutEverywhere(user.id, newPasswordHash, tx))

  audit('password.changed', { userId: user.id, email: user.email })

  void sendPasswordChangedEmail(user.email).catch((e: unknown) =>
    logger.error({ err: e }, 'password-change email failed'),
  )
}

export const forgotPasswordService = async (email: string, meta?: { ipAddress?: string; userAgent?: string }) => {
  const user = await findUserByEmail(email)

  if (!user || !user.is_active) return

  audit('password.reset.requested', { userId: user.id, email: user.email, ...meta })

  void issueAndSendReset(user.id, user.email, meta).catch((err: unknown) =>
    logger.error({ err, userId: user.id }, 'forgot-password issue/send failed'),
  )
}

export const resetPasswordService = async (dto: ResetPasswordDto) => {
  const { token, newPassword } = dto

  const resetToken = await findValidOneTimeTokenByHash(hashToken(token), PASSWORD_RESET_TOKEN)
  if (!resetToken) throw new AppError('Invalid or expired token', 400)

  const user = await findUserCredentialsById(resetToken.userId)
  if (!user || !user.is_active) throw new AppError('Invalid or expired token', 400)

  await assertPasswordIsNew(user.id, newPassword)

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_COST)

  const weClaimedTheToken = await getDb().transaction(async (tx) => {
    const claimed = await consumeOneTimeToken(resetToken.id, tx)
    if (!claimed) return false

    await savePasswordAndSignOutEverywhere(user.id, newPasswordHash, tx)
    return true
  })

  if (!weClaimedTheToken) throw new AppError('Invalid or expired token', 400)

  audit('password.reset.completed', { userId: user.id, email: user.email })

  void sendPasswordChangedEmail(user.email).catch((e: unknown) =>
    logger.error({ err: e }, 'password-reset email failed'),
  )
}

const issueAndSendReset = async (
  userId: string,
  email: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> => {
  const token = await getDb().transaction(async (tx) => {
    await markPendingTokensUsed(userId, PASSWORD_RESET_TOKEN, tx)
    return generatePasswordResetToken(userId, meta, tx)
  })

  await sendPasswordResetEmail(email, `${getAppUrl()}/reset-password?token=${token}`)
}

export const refreshTokenService = async (
  refreshToken: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<TokenPair> => {
  if (!refreshToken) throw new AppError('Unauthorized', 401)

  let verified: { userId: string }
  try {
    verified = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError('Unauthorized', 401)
  }

  const tokenHash = hashToken(refreshToken)
  const existingToken = await findRefreshTokenByHash(tokenHash)

  if (!existingToken) {
    audit('refresh.reused', { userId: verified.userId, ...meta })
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
