import { findUserAuthStateById } from 'modules/user/user.repository'

/**
 * Decides whether an otherwise-valid access token should still be honoured.
 *
 * Access tokens are self-contained, so signing out or changing a password cannot
 * reach the ones already handed out — they stay good until they expire on their own.
 * `users.last_logout_at` is the watermark that closes that window: anything issued
 * before it is refused, which is what makes "sign out everywhere" and a password
 * reset take effect now rather than up to fifteen minutes from now.
 *
 * `iat` only has second resolution, so the comparison is done in whole seconds. A
 * token minted in the same second as the logout survives; the alternative is
 * rejecting the fresh token of someone who signs straight back in.
 */
export const isTokenRevoked = async (userId: string, issuedAt: number): Promise<boolean> => {
  const state = await findUserAuthStateById(userId)

  if (!state || !state.is_active) return true

  if (!state.last_logout_at) return false

  return issuedAt < Math.floor(state.last_logout_at.getTime() / 1000)
}
