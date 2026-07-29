import { logger } from './logger'

/**
 * The security-relevant things that can happen to an account.
 *
 * These are written as their own log stream (`kind: "audit"`) so that the
 * question "what happened to this account?" has an answer months later, without
 * digging through ordinary chatter.
 */
export type AuditEvent =
  | 'login.succeeded'
  | 'login.failed'
  | 'logout.all'
  | 'password.changed'
  | 'password.reset.requested'
  | 'password.reset.completed'
  | 'refresh.reused'

type AuditDetails = {
  /** Who it happened to, when we know. Failed logins often have no user. */
  userId?: string
  /** Which email was used. Safe to log; passwords and tokens are not. */
  email?: string
  ipAddress?: string
  userAgent?: string
  /** Anything extra worth keeping, e.g. why a login failed. */
  reason?: string
}

/** Records one security-relevant event. Never throws — logging must not break a request. */
export const audit = (event: AuditEvent, details: AuditDetails = {}): void => {
  logger.info({ kind: 'audit', event, ...details }, `audit: ${event}`)
}
