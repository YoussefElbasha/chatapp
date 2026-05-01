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