import crypto from 'crypto'

export const generateOpaqueToken = (): string => crypto.randomBytes(32).toString('base64url')

export const hashToken = (raw: string): string => crypto.createHash('sha256').update(raw).digest('hex')
