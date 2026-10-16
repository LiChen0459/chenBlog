import { Hono } from 'hono'
import { getImagesRepo } from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { validateImage } from '../repositories/utils.js'

export const uploadRoutes = new Hono()

/**
 * POST /api/upload (admin) — multipart form.
 * Accepts a single `image` field, or repeated `images` fields for batch upload.
 * Returns `{ url, urls }`.
 */
uploadRoutes.post('/', requireAdmin, async (c) => {
  let body
  try {
    body = await c.req.parseBody({ all: true })
  } catch {
    return c.json({ ok: false, error: '请求体格式不正确', code: 'BAD_REQUEST' }, 400)
  }

  const raw = [
    ...(Array.isArray(body['images']) ? body['images'] : body['images'] ? [body['images']] : []),
    ...(Array.isArray(body['image']) ? body['image'] : body['image'] ? [body['image']] : []),
  ]

  if (!raw.length) {
    return c.json({ ok: false, error: '未选择图片文件', code: 'BAD_REQUEST' }, 400)
  }

  for (const file of raw) {
    const err = validateImage(file)
    if (err) return c.json({ ok: false, error: err, code: 'BAD_REQUEST' }, 400)
  }

  try {
    const repo = await getImagesRepo()
    const urls = []
    for (const file of raw) {
      const { url } = await repo.upload(file)
      urls.push(url)
    }
    return c.json({ ok: true, data: { url: urls[0], urls } }, 201)
  } catch (e) {
    console.error('POST /api/upload error:', e)
    return c.json({ ok: false, error: e.message || '上传失败' }, 500)
  }
})
