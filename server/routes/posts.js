import { Hono } from 'hono'
import { getPostsRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { today, normaliseLimit, normaliseOffset, normaliseIds } from '../repositories/utils.js'

export const postsRoutes = new Hono()

/** Only positive integers are valid post ids; anything else → null (yields a clean 404, never a DB 500). */
function parseId(raw) {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

// GET /api/posts?limit=N&offset=N  (or ?page=N as a shorthand for offset)
//
// Returns the LEAN projection (no `content`) because every caller of this
// endpoint renders a list. Full bodies come from GET /api/posts/:id.
postsRoutes.get('/', async (c) => {
  const repo = await getPostsRepo()

  const pageParam = c.req.query('page')
  const perPage = normaliseLimit(c.req.query('limit'), pageParam ? 10 : null, 200)
  const offset = pageParam
    ? (Math.max(1, Number(pageParam) || 1) - 1) * perPage
    : normaliseOffset(c.req.query('offset'))

  const [posts, total] = await Promise.all([
    repo.getAll({ limit: perPage, offset, withContent: false }),
    typeof repo.count === 'function' ? repo.count() : Promise.resolve(null),
  ])

  const totalCount = total ?? posts.length
  return c.json({
    ok: true,
    data: posts,
    total: totalCount,
    limit: perPage,
    offset,
    hasMore: perPage ? offset + posts.length < totalCount : false,
  })
})

// GET /api/posts/:id
postsRoutes.get('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  const repo = await getPostsRepo()
  const post = await repo.getById(id)
  if (!post) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: post })
})

// POST /api/posts (admin)
postsRoutes.post('/', requireAdmin, async (c) => {
  try {
    let body
    try { body = await c.req.json() } catch { body = {} }
    const repo = await getPostsRepo()
    const post = await repo.create({
      title: body.title || '无标题',
      date: body.date || today(),
      summary: body.summary || '',
      content: body.content || '',
      tags: body.tags || [],
      pinned: !!body.pinned,
    })
    return c.json({ ok: true, data: post }, 201)
  } catch (e) {
    console.error('POST /api/posts error:', e)
    return c.json({ ok: false, error: e.message || 'Server error' }, 500)
  }
})

// PUT /api/posts/:id (admin)
postsRoutes.put('/:id', requireAdmin, async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  let body
  try { body = await c.req.json() } catch { body = {} }
  const repo = await getPostsRepo()
  const post = await repo.update(id, body)
  if (!post) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: post })
})

// PATCH /api/posts/:id/pin (admin) — toggle the pinned flag
postsRoutes.patch('/:id/pin', requireAdmin, async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  const repo = await getPostsRepo()
  if (typeof repo.togglePin !== 'function') {
    return c.json({ ok: false, error: 'Pin is not supported by this storage backend', code: 'NOT_IMPLEMENTED' }, 501)
  }
  const result = await repo.togglePin(id)
  if (!result) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})

// DELETE /api/posts/:id (admin)
postsRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  const repo = await getPostsRepo()
  const result = await repo.delete(id)
  if (!result) return c.json({ ok: false, error: 'Post not found', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})

// POST /api/posts/bulk (admin)
//   { ids: number[], action: 'pin' | 'unpin' | 'delete' }
postsRoutes.post('/bulk', requireAdmin, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }

  const ids = normaliseIds(body.ids)
  const action = body.action

  if (!ids.length) {
    return c.json({ ok: false, error: '请先选择要操作的文章', code: 'VALIDATION' }, 400)
  }
  if (!['pin', 'unpin', 'delete'].includes(action)) {
    return c.json({ ok: false, error: '不支持的批量操作', code: 'VALIDATION' }, 400)
  }

  const repo = await getPostsRepo()

  if (action === 'delete') {
    if (typeof repo.deleteMany !== 'function') {
      return c.json({ ok: false, error: '当前存储不支持批量删除', code: 'NOT_IMPLEMENTED' }, 501)
    }
    return c.json({ ok: true, data: await repo.deleteMany(ids) })
  }

  if (typeof repo.setPinnedMany !== 'function') {
    return c.json({ ok: false, error: '当前存储不支持批量置顶', code: 'NOT_IMPLEMENTED' }, 501)
  }
  return c.json({ ok: true, data: await repo.setPinnedMany(ids, action === 'pin') })
})
