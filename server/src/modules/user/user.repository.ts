import { getDb } from 'db/client'
import { serverMembers, users } from 'db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import { uniqueViolationOf } from 'shared/utils/errors/pg-error'

import { UserConflictError } from './user.errors'
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
  last_login_at: users.lastLoginAt,
  last_logout_at: users.lastLogoutAt,
  created_at: users.createdAt,
  updated_at: users.updatedAt,
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

export const createUser = async (dto: CreateUserDto, db: ReturnType<typeof getDb> = getDb()): Promise<CreatedUser> => {
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
  } catch (err: unknown) {
    const constraint = uniqueViolationOf(err)

    if (constraint === 'users_username_discriminator_key') throw new UserConflictError('discriminator_taken')

    if (constraint === 'users_email_key' || constraint === 'users_email_lower_idx') {
      throw new UserConflictError('email_taken')
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
): Promise<{ id: string; email: string; password_hash: string; is_active: boolean } | null> => {
  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      password_hash: users.passwordHash,
      is_active: users.isActive,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export const markEmailVerified = async (id: string, db: ReturnType<typeof getDb> = getDb()): Promise<void> => {
  await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, id))
}

/**
 * Marks everything issued before now as no longer trustworthy. Access tokens are
 * self-contained, so this timestamp is the only way an already-signed one can be
 * turned down before it expires on its own.
 */
export const updateLastLogoutAt = async (id: string, db: ReturnType<typeof getDb> = getDb()): Promise<void> => {
  await db.update(users).set({ lastLogoutAt: new Date() }).where(eq(users.id, id))
}

/**
 * Takes an exclusive lock on the account row for the rest of the transaction.
 *
 * Used to serialise refresh-token rotation: without it, two requests racing with
 * the same token can interleave so that the loser's "burn every session" runs
 * before the winner inserts its replacement, leaving a live session behind after
 * reuse was already detected.
 */
export const lockUserRow = async (id: string, db: ReturnType<typeof getDb> = getDb()): Promise<void> => {
  await db.select({ id: users.id }).from(users).where(eq(users.id, id)).for('update')
}

/** The per-request check behind a bearer token: is this account still allowed in? */
export const findUserAuthStateById = async (
  id: string,
): Promise<{ is_active: boolean; last_logout_at: Date | null } | null> => {
  const rows = await getDb()
    .select({ is_active: users.isActive, last_logout_at: users.lastLogoutAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  return rows[0] ?? null
}
