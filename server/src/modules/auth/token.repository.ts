import { getPool } from 'db/pool'
import type { InsertRefreshTokenDto, RefreshTokenDb } from './token.types'

export const insertRefreshToken = async (dto: InsertRefreshTokenDto): Promise<void> => {
  const pool = getPool()

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [dto.userId, dto.tokenHash, dto.expiresAt, dto.ipAddress ?? null, dto.userAgent ?? null],
  )
}

export const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshTokenDb | null> => {
  const pool = getPool()

  const { rows } = await pool.query<RefreshTokenDb>(
    `SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt",
     ip_address AS "ipAddress", user_agent AS "userAgent", created_at AS "createdAt"
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  )

  return rows[0] ?? null
}

export const deleteRefreshTokenByHash = async (tokenHash: string): Promise<void> => {
  const pool = getPool()

  await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash])
}

export const deleteAllRefreshTokensByUserId = async (userId: string): Promise<void> => {
  const pool = getPool()

  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId])
}
