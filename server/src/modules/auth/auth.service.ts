import bcrypt from 'bcrypt'
import { createUser, findUserByEmail } from 'modules/user/user.repository'
import { AppError } from 'shared/utils/errors/app-error'

import type { LoginDto, RegisterDto } from './auth.schema'
import { CreatedUser } from 'modules/user/user.types'
import { generateTokenPair } from './token.service'
import { TokenPair } from './token.types'

const DUMMY_BCRYPT_HASH = '$2b$12$fE35fVzqo6vVxL0FpaB7GO8dlVZWpALxLJHUTJJPIFmU0Hjfg89nW'

const MAX_DISCRIMINATOR_ATTEMPTS = 5

export const registerService = async (
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ user: CreatedUser } & TokenPair> => {
  const { email, password, username, displayName } = dto

  const alreadyExists = await findUserByEmail(email)
  if (alreadyExists) throw new AppError('Email already in use', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  let user: CreatedUser | null = null

  for (let attempt = 0; attempt < MAX_DISCRIMINATOR_ATTEMPTS; attempt++) {
    const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, '0')

    try {
      user = await createUser({ email, username, discriminator, passwordHash, displayName })
      break
    } catch (err: any) {
      if (err.message === 'DISCRIMINATOR_TAKEN') continue
      throw err
    }
  }

  if (!user) throw new AppError('Username is unavailable, please choose a different one', 409)

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

  if (!user || !isValid) throw new AppError('Invalid email or password', 401)
  if (!user.is_active) throw new AppError('Account disabled', 403)
  // if (!user.email_verified) throw new AppError('Email not verified', 403)

  const tokens = await generateTokenPair(user.id, meta)

  return { user: { id: user.id, email: user.email }, ...tokens }
}
