import { Hono } from 'hono'
import { getMessagesRepo } from '../repositories/index.js'
import { requireAdmin, isAdmin } from '../middleware/auth.js'
import { normaliseLimit, normaliseOffset, MAX_NICKNAME_LEN, MAX_MESSAGE_LEN } from '../repositories/utils.js'

export const messagesRoutes = new Hono()

// GET /api/messages?limit=N&offset=N (public)
// Hidden messages only show up for the admin.
messagesRoutes.get('/', async (c) => {
  const repo = await getMessagesRepo()
  const includeHidden = isAdmin(c)
  const limit = normaliseLimit(c.req.query('limit'), 50, 200)
  const offset = normaliseOffset(c.req.query('offset'))

  const [messages, total] = await Promise.all([
    repo.getAll({ limit, offset, includeHidden }),
    typeof repo.count === 'function' ? repo.count({ includeHidden }) : Promise.resolve(null),
  ])

  const totalCount = total ?? messages.length
  return c.json({
    ok: true,
    data: messages,
    total: totalCount,
    limit,
    offset,
    hasMore: limit ? offset + messages.length < totalCount : false,
  })
})

// POST /api/messages (public — the guestbook form)
// No auth on purpose; spam is contained with length caps. The `website`
// honeypot field must stay empty — hidden from real users via CSS.
messagesRoutes.post('/', async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }

  if (typeof body.website === 'string' && body.website.trim()) {
    // Bot filled the honeypot — pretend success, drop the message.
    return c.json({ ok: true, data: null }, 201)
  }

  const nickname = String(body.nickname ?? '').trim()
  const content = String(body.content ?? '').trim()
  if (!content) {
    return c.json({ ok: false, error: '留言内容不能为空', code: 'VALIDATION' }, 400)
  }
  if (content.length > MAX_MESSAGE_LEN) {
    return c.json({ ok: false, error: `留言最长 ${MAX_MESSAGE_LEN} 字`, code: 'VALIDATION' }, 400)
  }
  if (nickname.length > MAX_NICKNAME_LEN) {
    return c.json({ ok: false, error: `昵称最长 ${MAX_NICKNAME_LEN} 个字符`, code: 'VALIDATION' }, 400)
  }

  const repo = await getMessagesRepo()
  const message = await repo.create({
    nickname: nickname || '匿名',
    content,
  })
  return c.json({ ok: true, data: message }, 201)
})

// PATCH /api/messages/:id (admin) — toggle hidden: { hidden: true|false }
messagesRoutes.patch('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ ok: false, error: '留言不存在', code: 'NOT_FOUND' }, 404)
  }
  let body
  try { body = await c.req.json() } catch { body = {} }
  const repo = await getMessagesRepo()
  const result = await repo.setHidden(id, !!body.hidden)
  if (!result) return c.json({ ok: false, error: '留言不存在', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})

// DELETE /api/messages/:id (admin)
messagesRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ ok: false, error: '留言不存在', code: 'NOT_FOUND' }, 404)
  }
  const repo = await getMessagesRepo()
  const result = await repo.delete(id)
  if (!result) return c.json({ ok: false, error: '留言不存在', code: 'NOT_FOUND' }, 404)
  return c.json({ ok: true, data: result })
})
