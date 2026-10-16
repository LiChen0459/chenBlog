import { Hono } from 'hono'
import { getMomentsRepo, getSettingsRepo } from '../repositories/index.js'
import { requireAdmin, canSeeHidden } from '../middleware/auth.js'
import {
  today,
  verifyPassword,
  safeEqualString,
  signUnlockToken,
  UNLOCK_TOKEN_TTL_MS,
  normaliseLimit,
  normaliseOffset,
  normaliseIds,
} from '../repositories/utils.js'
import { MOMENTS_PASSWORD_KEY } from './settings.js'

export const momentsRoutes = new Hono()

// GET /api/moments?limit=N&offset=N
// Hidden moments are only included for the admin, or for a visitor holding a
// scoped unlock token obtained from POST /api/moments/unlock.
momentsRoutes.get('/', async (c) => {
  const repo = await getMomentsRepo()
  const includeHidden = canSeeHidden(c)
  const limit = normaliseLimit(c.req.query('limit'), null, 100)
  const offset = normaliseOffset(c.req.query('offset'))

  const [moments, total] = await Promise.all([
    repo.getAll({ limit, offset, includeHidden }),
    typeof repo.count === 'function' ? repo.count({ includeHidden }) : Promise.resolve(null),
  ])

  const totalCount = total ?? moments.length
  return c.json({
    ok: true,
    data: moments,
    total: totalCount,
    limit,
    offset,
    hasMore: limit ? offset + moments.length < totalCount : false,
  })
})

// GET /api/moments/hidden-count — public: how many moments are hidden.
// Declared before `/:id` so it is not swallowed by the numeric id route.
momentsRoutes.get('/hidden-count', async (c) => {
  const repo = await getMomentsRepo()
  const count = typeof repo.countHidden === 'function' ? await repo.countHidden() : 0
  return c.json({ ok: true, data: { count } })
})

// POST /api/moments/unlock (public)
// Exchanges the moments password for a scoped, expiring token. The admin token
// itself is never handed to a public visitor.
momentsRoutes.post('/unlock', async (c) => {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) {
    return c.json({ ok: false, error: '服务端未配置 ADMIN_TOKEN', code: 'SERVER_ERROR' }, 500)
  }

  let body
  try { body = await c.req.json() } catch { body = {} }
  // Trimmed to match how the password is stored (see routes/settings.js).
  const password = typeof body.password === 'string' ? body.password.trim() : ''
  if (!password) {
    return c.json({ ok: false, error: '请输入密码', code: 'VALIDATION' }, 400)
  }

  // A custom password (if set) wins; otherwise fall back to ADMIN_TOKEN.
  const settings = await getSettingsRepo()
  const stored = await settings.get(MOMENTS_PASSWORD_KEY)
  const ok = stored
    ? await verifyPassword(password, stored)
    : safeEqualString(password, adminToken)

  if (!ok) {
    return c.json({ ok: false, error: '密码不正确', code: 'UNAUTHORIZED' }, 401)
  }

  return c.json({ ok: true, data: { token: signUnlockToken(), expiresIn: UNLOCK_TOKEN_TTL_MS } })
})

// GET /api/moments/:id
momentsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const repo = await getMomentsRepo()
  const moment = await repo.getById(id)
  if (!moment) return c.json({ ok: false, error: 'Moment not found', code: 'NOT_FOUND' }, 404)
  if (moment.hidden && !canSeeHidden(c)) {
    return c.json({ ok: false, error: 'Moment not found', code: 'NOT_FOUND' }, 404)
  }
  return c.json({ ok: true, data: moment })
})

// POST /api/moments/bulk (admin)
// One endpoint for every batch action so the admin UI has a single code path:
//   { ids: number[], action: 'hide' | 'show' | 'delete' }
// Declared before the `/:id` handlers so `bulk` is never parsed as an id.
momentsRoutes.post('/bulk', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }

  const ids = normaliseIds(body.ids)
  const action = body.action

  if (!ids.length) {
    return c.json({ ok: false, error: '请先选择要操作的动态', code: 'VALIDATION' }, 400)
  }
  if (!['hide', 'show', 'delete'].includes(action)) {
    return c.json({ ok: false, error: '不支持的批量操作', code: 'VALIDATION' }, 400)
  }

  const repo = await getMomentsRepo()

  if (action === 'delete') {
    if (typeof repo.deleteMany !== 'function') {
      return c.json({ ok: false, error: '当前存储不支持批量删除', code: 'NOT_IMPLEMENTED' }, 501)
    }
    return c.json({ ok: true, data: await repo.deleteMany(ids) })
  }

  if (typeof repo.setHiddenMany !== 'function') {
    return c.json({ ok: false, error: '当前存储不支持批量隐藏', code: 'NOT_IMPLEMENTED' }, 501)
  }
  return c.json({ ok: true, data: await repo.setHiddenMany(ids, action === 'hide') })
})


// POST /api/moments (admin) — `images` accepts an array of URLs
momentsRoutes.post('/', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }
  const repo = await getMomentsRepo()
  const moment = await repo.create({
    date: body.date || today(),
    time: body.time || new Date().toTimeString().slice(0, 5),
    content: body.content || '',
    images: body.images ?? body.image ?? [],
    tags: body.tags || [],
    hidden: !!body.hidden,
  })
  return c.json({ ok: true, data: moment }, 201)
})

// PUT /api/moments/:id (admin)
momentsRoutes.put('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  let body
  try { body = await c.req.json() } catch { body = {} }
  const repo = await getMomentsRepo()
  const moment = await repo.update(id, body)
  if (!moment) return c.json({ ok: false, error: 'Moment not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: moment })
})

// DELETE /api/moments/:id (admin)
momentsRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const repo = await getMomentsRepo()
  const result = await repo.delete(id)
  if (!result) return c.json({ ok: false, error: 'Moment not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})
