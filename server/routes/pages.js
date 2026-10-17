import { Hono } from 'hono'
import { getPagesRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'

export const pagesRoutes = new Hono()

// GET /api/pages — every standalone page (关于我 / 友情链接 / …).
// Pages are few and small, so the full list (content included) ships in one go.
pagesRoutes.get('/', async (c) => {
  const repo = await getPagesRepo()
  const pages = await repo.getAll()
  return c.json({ ok: true, data: pages, total: pages.length })
})

// GET /api/pages/:slug — one page. Declared after the collection route so a
// caller-visible slug can never shadow it.
pagesRoutes.get('/:slug', async (c) => {
  const repo = await getPagesRepo()
  const page = await repo.getBySlug(c.req.param('slug'))
  if (!page) return c.json({ ok: false, error: '页面不存在', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: page })
})

// POST /api/pages (admin) — create. { slug, title, content }
pagesRoutes.post('/', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }
  try {
    const repo = await getPagesRepo()
    const page = await repo.create({
      slug: body.slug,
      title: body.title,
      content: body.content,
    })
    return c.json({ ok: true, data: page }, 201)
  } catch (e) {
    return c.json({ ok: false, error: e.message || 'Server error' }, 400)
  }
})

// PUT /api/pages/:slug (admin) — update by slug
pagesRoutes.put('/:slug', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }
  try {
    const repo = await getPagesRepo()
    const page = await repo.update(c.req.param('slug'), body)
    if (!page) return c.json({ ok: false, error: '页面不存在', code: 'NOT_FOUND' }, 404)
    return c.json({ ok: true, data: page })
  } catch (e) {
    return c.json({ ok: false, error: e.message || 'Server error' }, 400)
  }
})

// DELETE /api/pages/:slug (admin)
pagesRoutes.delete('/:slug', requireAdmin, async (c) => {
  const repo = await getPagesRepo()
  const result = await repo.delete(c.req.param('slug'))
  if (!result) return c.json({ ok: false, error: '页面不存在', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})
