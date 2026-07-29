export type RefreshTokenDb = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export type InsertRefreshTokenDto = {
  userId: string
  tokenHash: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

export type TokenType = 'email_verification' | 'password_reset'

export type OneTimeTokenRow = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  type: TokenType
}

export type InsertOneTimeTokenDto = {
  userId: string
  tokenHash: string
  type: TokenType
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}
