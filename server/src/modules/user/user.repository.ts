import { getPool } from 'db/pool'

import type { CreatedUser, CreateUserDto, LoginRow, UserDb } from './user.types'

const USER_COLUMNS = `
  id,
  email,
  username,
  discriminator,
  display_name,
  avatar_url,
  bio,
  status,
  email_verified,
  is_active,
  last_login_at,
  last_logout_at,
  created_at,
  updated_at
`

export const findUserById = async (id: string): Promise<UserDb | null> => {
  const pool = getPool()

  const { rows } = await pool.query<UserDb>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])

  return rows[0] ?? null
}

export const findUserByEmail = async (email: string): Promise<LoginRow | null> => {
  const pool = getPool()

  const { rows } = await pool.query<LoginRow>(
    `SELECT id, email, password_hash, email_verified, is_active FROM users WHERE email = $1 LIMIT 1`,
    [email],
  )

  return rows[0] ?? null
}

export const findAllUsers = async (): Promise<UserDb[]> => {
  const pool = getPool()

  const { rows } = await pool.query<UserDb>(`SELECT ${USER_COLUMNS} FROM users`)

  return rows
}

export const findUsersByServerId = async (serverId: string): Promise<UserDb[]> => {
  const pool = getPool()

  const { rows } = await pool.query<UserDb>(
    `SELECT ${USER_COLUMNS}
     FROM users
     WHERE users.id IN (
       SELECT user_id
       FROM server_members
       WHERE server_id = $1
     )`,
    [serverId],
  )

  return rows
}

export const createUser = async (dto: CreateUserDto): Promise<CreatedUser> => {
  const pool = getPool()

  try {
    const { rows } = await pool.query<CreatedUser>(
      `
      INSERT INTO users (email, username, discriminator, password_hash, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, discriminator, display_name AS "displayName"
      `,
      [dto.email, dto.username, dto.discriminator, dto.passwordHash, dto.displayName],
    )

    return rows[0]
  } catch (err: any) {
      if (err.code === '23505') {
        if (err.constraint === 'users_username_discriminator_key') throw new Error('DISCRIMINATOR_TAKEN')
        if (err.constraint === 'users_email_key') throw new Error('EMAIL_TAKEN')
      }    
    throw err
  }
}

export const deleteUserById = async (id: string): Promise<void> => {
  const pool = getPool()

  await pool.query(`DELETE FROM users WHERE id = $1`, [id])
}
