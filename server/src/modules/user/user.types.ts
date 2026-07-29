export interface User {
  id: string
  email: string
  username: string
  discriminator: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  status: string
  emailVerified: boolean
  isActive: boolean
  lastLoginAt: Date | null
  lastLogoutAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserDb {
  id: string
  email: string
  username: string
  discriminator: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  status: string
  email_verified: boolean
  is_active: boolean
  last_login_at: Date | null
  last_logout_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface LoginRow {
  id: string
  email: string
  password_hash: string
  is_active: boolean
  email_verified: boolean
}

export type CreateUserDto = {
  email: string
  username: string
  discriminator: string
  passwordHash: string
  displayName?: string
}

export type CreatedUser = {
  id: string
  email: string
  username: string
  discriminator: string
  displayName: string | null
}
