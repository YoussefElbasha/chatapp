import bcrypt from 'bcrypt'
import { getDb } from 'db/client'
import { UserConflictError } from 'modules/user/user.errors'
import {
  createUser,
  findUserByEmail,
  findUserCredentialsById,
  lockUserRow,
  markEmailVerified,
  updateLastLoginAt,
  updateLastLogoutAt,
  updatePasswordHash,
} from 'modules/user/user.repository'
import { type CreatedUser } from 'modules/user/user.types'
import { getAppUrl } from 'shared/email/client'
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendVerificationEmail } from 'shared/email/email.service'
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
  claimRefreshToken,
  consumeOneTimeToken,
  deleteAllRefreshTokensByUserId,
  expireRefreshTokenByHash,
  expireRefreshTokensByUserId,
  findValidOneTimeTokenByHash,
  markPendingTokensUsed,
} from './token.repository'
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateTokenPair,
  verifyRefreshToken,
} from './token.service'
import { type TokenPair } from './token.types'

const DUMMY_BCRYPT_HASH = '$2b$12$fE35fVzqo6vVxL0FpaB7GO8dlVZWpALxLJHUTJJPIFmU0Hjfg89nW'

const MAX_DISCRIMINATOR_ATTEMPTS = 5

const PASSWORD_RESET_TOKEN = 'password_reset'

const EMAIL_VERIFICATION_TOKEN = 'email_verification'

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
  await expireRefreshTokensByUserId(userId, tx)
  // Access tokens are self-contained, so cutting the refresh tokens alone would
  // leave a stolen one working for up to another 15 minutes — exactly the window a
  // password reset is meant to close.
  await updateLastLogoutAt(userId, tx)
  // A reset link the user requested minutes ago is still live for the rest of its
  // hour. Whoever just proved they know the password gets to retire it.
  await markPendingTokensUsed(userId, PASSWORD_RESET_TOKEN, tx)
}

export const registerService = async (
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ user: CreatedUser }> => {
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

  // No session here: login refuses unverified accounts, so handing out a token pair
  // at registration would be a way around the gate rather than a convenience.
  const created = user

  void issueAndSendVerification(created.id, created.email, meta).catch((err: unknown) =>
    logger.error({ err, userId: created.id }, 'verification issue/send failed'),
  )

  return { user: created }
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

  // Deliberately a distinct, specific error. It only fires once the password has
  // already checked out, so it tells an attacker nothing they did not just prove
  // they knew — and the client needs to tell these two failures apart to send the
  // user to a "check your inbox" screen instead of "wrong password".
  if (!user.email_verified) {
    audit('login.failed', { userId: user.id, email: user.email, reason: 'unverified_email', ...meta })
    throw new AppError('Email not verified', 403, 'EMAIL_NOT_VERIFIED')
  }

  void updateLastLoginAt(user.id).catch((e: unknown) => logger.error({ err: e }, 'updateLastLoginAt failed'))

  const tokens = await generateTokenPair(user.id, meta)

  audit('login.succeeded', { userId: user.id, email: user.email, ...meta })

  return { user: { id: user.id, email: user.email }, ...tokens }
}

export const logoutService = async (refreshToken: string) => {
  if (!refreshToken) return

  const tokenHash = hashToken(refreshToken)

  await expireRefreshTokenByHash(tokenHash)
}

export const logoutAllService = async (userId: string) => {
  if (!userId) return

  await getDb().transaction(async (tx) => {
    await expireRefreshTokensByUserId(userId, tx)
    await updateLastLogoutAt(userId, tx)
  })

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

  // The whole rotation runs under a lock on the account row. Claiming the token is
  // already atomic on its own, but without the lock a losing request can burn every
  // session in the gap between the winner claiming its token and inserting the
  // replacement — leaving a live session behind precisely when reuse was detected.
  const outcome = await getDb().transaction(
    async (tx): Promise<{ reused: true } | { reused: false; tokens: TokenPair | null }> => {
      await lockUserRow(verified.userId, tx)

      const claimed = await claimRefreshToken(tokenHash, tx)

      if (!claimed) {
        // Nothing to claim means this token was already rotated away and someone is
        // replaying a copy. Tokens retired by logout or a password change leave an
        // expired row behind and land in the branch below, so this really is theft
        // rather than a stale tab.
        await deleteAllRefreshTokensByUserId(verified.userId, tx)
        return { reused: true }
      }

      // Retired normally, or simply aged out. A plain refusal, no alarm.
      if (claimed.expiresAt < new Date()) return { reused: false, tokens: null }

      return { reused: false, tokens: await generateTokenPair(claimed.userId, meta, tx) }
    },
  )

  if (outcome.reused) {
    audit('refresh.reused', { userId: verified.userId, ...meta })
    throw new AppError('Unauthorized', 401)
  }

  if (!outcome.tokens) throw new AppError('Unauthorized', 401)

  return outcome.tokens
}

const issueAndSendVerification = async (
  userId: string,
  email: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> => {
  const token = await getDb().transaction(async (tx) => {
    await markPendingTokensUsed(userId, EMAIL_VERIFICATION_TOKEN, tx)
    return generateEmailVerificationToken(userId, meta, tx)
  })

  await sendVerificationEmail(email, `${getAppUrl()}/verify-email?token=${token}`)

  audit('email.verification.sent', { userId, email, ...meta })
}

export const verifyEmailService = async (token: string) => {
  const verificationToken = await findValidOneTimeTokenByHash(hashToken(token), EMAIL_VERIFICATION_TOKEN)
  if (!verificationToken) throw new AppError('Invalid or expired token', 400)

  const user = await findUserCredentialsById(verificationToken.userId)
  if (!user || !user.is_active) throw new AppError('Invalid or expired token', 400)

  // Same claim-then-write shape as the password reset: the conditional update is
  // what makes a double submit resolve to exactly one winner.
  const weClaimedTheToken = await getDb().transaction(async (tx) => {
    const claimed = await consumeOneTimeToken(verificationToken.id, tx)
    if (!claimed) return false

    await markEmailVerified(user.id, tx)
    return true
  })

  if (!weClaimedTheToken) throw new AppError('Invalid or expired token', 400)

  audit('email.verified', { userId: user.id, email: user.email })
}

export const resendVerificationService = async (email: string, meta?: { ipAddress?: string; userAgent?: string }) => {
  const user = await findUserByEmail(email)

  // Silent in every branch, like forgot-password: whether an address is registered,
  // active or already verified is not something an unauthenticated caller may probe.
  if (!user || !user.is_active || user.email_verified) return

  void issueAndSendVerification(user.id, user.email, meta).catch((err: unknown) =>
    logger.error({ err, userId: user.id }, 'resend-verification issue/send failed'),
  )
}
