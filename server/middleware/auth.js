/**
 * Simple Bearer token auth middleware.
 * Checks Authorization header against ADMIN_TOKEN env var.
 */
export function requireAdmin(c, next) {
  const token = process.env.ADMIN_TOKEN
  if (!token) {
    return c.json({ ok: false, error: 'ADMIN_TOKEN not configured', code: 'SERVER_ERROR' }, 500)
  }
  const auth = c.req.header('Authorization')
  if (!auth || auth !== `Bearer ${token}`) {
    return c.json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }
  return next()
}
