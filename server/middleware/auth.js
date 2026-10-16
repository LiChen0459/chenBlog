/**
 * Simple Bearer token auth middleware.
 * Checks Authorization header against ADMIN_TOKEN env var.
 */
import { safeEqualString, verifyUnlockToken } from '../repositories/utils.js'

export const UNLOCK_HEADER = 'X-Moments-Unlock'

export function requireAdmin(c, next) {
  const token = process.env.ADMIN_TOKEN
  if (!token) {
    return c.json({ ok: false, error: 'ADMIN_TOKEN not configured', code: 'SERVER_ERROR' }, 500)
  }
  const auth = c.req.header('Authorization')
  if (!auth || !safeEqualString(auth, `Bearer ${token}`)) {
    return c.json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }
  return next()
}

/**
 * Non-blocking variant: returns true when the request carries a valid admin
 * Bearer token, false otherwise. Used to *optionally* reveal hidden content
 * (e.g. hidden moments) without rejecting anonymous visitors.
 */
export function isAdmin(c) {
  const token = process.env.ADMIN_TOKEN
  if (!token) return false
  return safeEqualString(c.req.header('Authorization'), `Bearer ${token}`)
}

/**
 * Whether the caller may see hidden moments. True for the admin, or for a
 * visitor holding a scoped unlock token minted by POST /api/moments/unlock
 * after entering the moments password.
 */
export function canSeeHidden(c) {
  if (isAdmin(c)) return true
  return verifyUnlockToken(c.req.header(UNLOCK_HEADER))
}

