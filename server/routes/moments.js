import { Hono } from 'hono'
import { getMomentsRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'

export const momentsRoutes = new Hono()

// GET /api/moments?limit=N
momentsRoutes.get('/', async (c) => {
  const limit = c.req.query('limit')
  const repo = await getMomentsRepo()
  const moments = await repo.getAll({ limit: limit ? Number(limit) : undefined })
  return c.json({ ok: true, data: moments, total: moments.length })
})

// POST /api/moments (admin)
momentsRoutes.post('/', requireAdmin, async (c) => {
  const body = await c.req.json()
  const repo = await getMomentsRepo()
  const moment = await repo.create({
    date: body.date || new Date().toISOString().slice(0, 10),
    time: body.time || new Date().toTimeString().slice(0, 5),
    content: body.content || '',
    image: body.image || null,
  })
  return c.json({ ok: true, data: moment }, 201)
})

// PUT /api/moments/:id (admin)
momentsRoutes.put('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
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
