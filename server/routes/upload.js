import { Hono } from 'hono'
import { getImagesRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'

export const uploadRoutes = new Hono()

// POST /api/upload (admin) — multipart form: field "image"
uploadRoutes.post('/', requireAdmin, async (c) => {
  const body = await c.req.parseBody()
  const file = body['image']

  if (!file || typeof file === 'string') {
    return c.json({ ok: false, error: 'No image file provided', code: 'BAD_REQUEST' }, 400)
  }

  const repo = await getImagesRepo()
  const result = await repo.upload(file)
  return c.json({ ok: true, data: result }, 201)
})
