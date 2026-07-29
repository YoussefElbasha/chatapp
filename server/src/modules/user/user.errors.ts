/** Why a user could not be created. */
export type UserConflictReason = 'discriminator_taken' | 'email_taken'

/**
 * Thrown when the database refuses a new user because something must be unique.
 *
 * This replaces passing reasons around as error *message strings*, which the
 * compiler cannot check and a typo would silently break.
 */
export class UserConflictError extends Error {
  constructor(public readonly reason: UserConflictReason) {
    super(`User conflict: ${reason}`)
    this.name = 'UserConflictError'
  }
}
