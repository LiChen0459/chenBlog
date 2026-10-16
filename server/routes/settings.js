import { Hono } from 'hono'
import { getSettingsRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { hashPassword } from '../repositories/utils.js'

/** Settings key holding the scrypt hash of the moments unlock password. */
export const MOMENTS_PASSWORD_KEY = 'moments_password'

const MIN_LEN = 4
const MAX_LEN = 128

export const settingsRoutes = new Hono()

// GET /api/settings/moments-password (admin)
// Reports *whether* a custom password is set — never returns the hash itself.
settingsRoutes.get('/moments-password', requireAdmin, async (c) => {
  const repo = await getSettingsRepo()
  const stored = await repo.get(MOMENTS_PASSWORD_KEY)
  return c.json({ ok: true, data: { custom: !!stored, minLength: MIN_LEN } })
})

// PUT /api/settings/moments-password (admin)
// body { password } — an empty string clears it and falls back to ADMIN_TOKEN.
settingsRoutes.put('/moments-password', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }

  const raw = typeof body.password === 'string' ? body.password.trim() : ''
  const repo = await getSettingsRepo()

  if (!raw) {
    await repo.delete(MOMENTS_PASSWORD_KEY)
    return c.json({ ok: true, data: { custom: false } })
  }
  if (raw.length < MIN_LEN) {
    return c.json({ ok: false, error: `密码至少 ${MIN_LEN} 位`, code: 'VALIDATION' }, 400)
  }
  if (raw.length > MAX_LEN) {
    return c.json({ ok: false, error: `密码最长 ${MAX_LEN} 位`, code: 'VALIDATION' }, 400)
  }

  try {
    await repo.set(MOMENTS_PASSWORD_KEY, await hashPassword(raw))
  } catch (e) {
    return c.json(
      { ok: false, error: `保存失败：${e.message}。线上库需要先执行 npm run db:migrate 建 settings 表。`, code: 'STORAGE' },
      500,
    )
  }
  return c.json({ ok: true, data: { custom: true } })
})
