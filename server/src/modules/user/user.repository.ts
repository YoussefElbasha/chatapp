import { eq, inArray, sql } from 'drizzle-orm'
import { getDb } from 'db/client'
import { serverMembers, users } from 'db/schema'

import type { CreatedUser, CreateUserDto, LoginRow, UserDb } from './user.types'

const userColumns = {
  id: users.id,
  email: users.email,
  username: users.username,
  discriminator: users.discriminator,
  display_name: users.displayName,
  avatar_url: users.avatarUrl,
  bio: users.bio,
  status: users.status,
  email_verified: users.emailVerified,
  is_active: users.isActive,
  last_logout_at: users.lastLogoutAt,
}

export const findUserById = async (id: string): Promise<UserDb | null> => {
  const rows = await getDb().select(userColumns).from(users).where(eq(users.id, id)).limit(1)
  return (rows[0] as UserDb | undefined) ?? null
}

export const findUserByEmail = async (email: string): Promise<LoginRow | null> => {
  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      password_hash: users.passwordHash,
      email_verified: users.emailVerified,
      is_active: users.isActive,
    })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1)

  return (rows[0] as LoginRow | undefined) ?? null
}

export const findAllUsers = async (): Promise<UserDb[]> => {
  const rows = await getDb().select(userColumns).from(users)
  return rows as UserDb[]
}

export const findUsersByServerId = async (serverId: string): Promise<UserDb[]> => {
  const rows = await getDb()
    .select(userColumns)
    .from(users)
    .where(
      inArray(
        users.id,
        getDb()
          .select({ userId: serverMembers.userId })
          .from(serverMembers)
          .where(eq(serverMembers.serverId, serverId)),
      ),
    )
  return rows as UserDb[]
}

export const createUser = async (
  dto: CreateUserDto,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<CreatedUser> => {
  try {
    const rows = await db
      .insert(users)
      .values({
        email: dto.email,
        username: dto.username,
        discriminator: dto.discriminator,
        passwordHash: dto.passwordHash,
        displayName: dto.displayName ?? null,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        discriminator: users.discriminator,
        displayName: users.displayName,
      })

    return rows[0] as CreatedUser
  } catch (err: any) {
    if (err?.code === '23505') {
      if (err.constraint === 'users_username_discriminator_key') throw new Error('DISCRIMINATOR_TAKEN')
      if (err.constraint === 'users_email_key' || err.constraint === 'users_email_lower_idx') {
        throw new Error('EMAIL_TAKEN')
      }
    }
    throw err
  }
}

export const deleteUserById = async (id: string): Promise<void> => {
  await getDb().delete(users).where(eq(users.id, id))
}

export const updateLastLoginAt = async (id: string): Promise<void> => {
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id))
}

export const updatePasswordHash = async (
  id: string,
  passwordHash: string,
  db: ReturnType<typeof getDb> = getDb(),
): Promise<void> => {
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id))
}

export const findUserCredentialsById = async (
  id: string,
): Promise<{ id: string; email: string; password_hash: string } | null> => {
  const rows = await getDb()
    .select({ id: users.id, email: users.email, password_hash: users.passwordHash })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export const markEmailVerified = async (id: string): Promise<void> => {
  await getDb().update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, id))
}
