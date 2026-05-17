import type { User, UserDb } from 'modules/user/user.types'

export const mapUserDbToUser = (row: UserDb): User => ({
  id: row.id,
  email: row.email,
  username: row.username,
  discriminator: row.discriminator,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  status: row.status,
  emailVerified: row.email_verified,
  isActive: row.is_active,
  lastLoginAt: row.last_login_at,
  lastLogoutAt: row.last_logout_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
