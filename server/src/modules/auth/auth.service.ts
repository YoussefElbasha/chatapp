import bcrypt from 'bcrypt'
import { createUser, findUserByEmail } from 'modules/user/user.repository'
import { AppError } from 'shared/utils/errors/app-error'

import type { RegisterDto } from './auth.schema'
import { CreatedUser } from 'modules/user/user.types'
import { generateTokenPair } from './token.service';
import { TokenPair } from './token.types';

//const DUMMY_BCRYPT_HASH = '$2b$12$fE35fVzqo6vVxL0FpaB7GO8dlVZWpALxLJHUTJJPIFmU0Hjfg89nW'

const MAX_DISCRIMINATOR_ATTEMPTS = 5

export const registerService = async (
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string }
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

// export const loginService = async (email: string, password: string) => {
//   if (!email || !password) throw new AppError('Missing required fields', 400)

//   const normalizedEmail = email.trim().toLowerCase()
//   if (!normalizedEmail) throw new AppError('Missing required fields', 400)

//   const row = await findUserByEmail(normalizedEmail)

//   const passwordHash: string = row?.password_hash ?? DUMMY_BCRYPT_HASH
//   const isValid = await bcrypt.compare(password, passwordHash)

//   if (!row || !isValid) throw new AppError('Invalid email or password', 401)
//   if (!row.is_active) throw new AppError('Account disabled', 403)
//   if (!row.email_verified) throw new AppError('Email not verified', 403)

//   return { id: row.id, email: row.email }
// }
