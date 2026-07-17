import { Hono } from 'hono'
import { getPostsRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'

export const postsRoutes = new Hono()

// GET /api/posts?limit=N
postsRoutes.get('/', async (c) => {
  const limit = c.req.query('limit')
  const repo = await getPostsRepo()
  const posts = await repo.getAll({ limit: limit ? Number(limit) : undefined })
  return c.json({ ok: true, data: posts, total: posts.length })
})

// GET /api/posts/:id
postsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const repo = await getPostsRepo()
  const post = await repo.getById(id)
  if (!post) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: post })
})

// POST /api/posts (admin)
postsRoutes.post('/', requireAdmin, async (c) => {
  try {
    console.error('POST handler entered')
    let body
    try { body = await c.req.json() } catch (e) { body = {} }
    console.error('body parsed:', JSON.stringify(body))
    const repo = await getPostsRepo()
    const post = await repo.create({
      title: body.title || 'Untitled',
      date: body.date || new Date().toISOString().slice(0, 10),
      summary: body.summary || '',
      content: body.content || '',
      tags: body.tags || [],
    })
    return c.json({ ok: true, data: post }, 201)
  } catch (e) {
    console.error('POST /api/posts error:', e.message, e.stack)
    return c.json({ ok: false, error: e.message || 'Server error' }, 500)
  }
})

// PUT /api/posts/:id (admin)
postsRoutes.put('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const repo = await getPostsRepo()
  const post = await repo.update(id, body)
  if (!post) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: post })
})

// DELETE /api/posts/:id (admin)
postsRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const repo = await getPostsRepo()
  const result = await repo.delete(id)
  if (!result) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})
