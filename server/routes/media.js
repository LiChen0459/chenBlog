import { Hono } from 'hono'
import {
  getImagesRepo,
  getPostsRepo,
  getMomentsRepo,
  getPagesRepo,
} from '../repositories/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { normaliseLimit } from '../repositories/utils.js'

export const mediaRoutes = new Hono()

/** One place an image is referenced. `slug` only exists for pages. */
const usageOf = (type, id, title, slug) => ({ type, id, title, ...(slug ? { slug } : {}) })

/**
 * url → [{ type, id, title }]: scans post bodies, moment images (current
 * `images` array + legacy single `image`) and page bodies. Images are only
 * ever referenced by their URL as a plain substring, so a substring check is
 * both sufficient and cheap at blog scale.
 *
 * Exported so the Vercel entry can share this exact logic instead of
 * re-implementing it (both entry points must behave identically).
 */
export async function buildUsageIndex(urls) {
  const index = new Map(urls.map((u) => [u, []]))
  if (!index.size) return index
  const note = (url, type, id, title) => {
    const arr = index.get(url)
    if (arr) arr.push(usageOf(type, id, title))
  }

  const [posts, moments, pages] = await Promise.all([
    getPostsRepo().then((r) => r.getAll({ withContent: true, limit: 500 })),
    getMomentsRepo().then((r) => r.getAll({ limit: 500 })),
    getPagesRepo().then((r) => r.getAll()),
  ])

  for (const p of posts) {
    for (const url of urls) {
      if (p.content && p.content.includes(url)) note(url, 'post', p.id, p.title || `文章 ${p.id}`)
    }
  }
  for (const m of moments) {
    const label = String(m.content || '').replace(/\s+/g, ' ').trim().slice(0, 24) || `动态 ${m.id}`
    for (const url of urls) {
      const inImages = (m.images || []).includes(url) || m.image === url
      const inText = m.content && m.content.includes(url)
      if (inImages || inText) note(url, 'moment', m.id, label)
    }
  }
  for (const pg of pages) {
    for (const url of urls) {
      if (pg.content && pg.content.includes(url)) {
        note(url, 'page', pg.id, pg.title || `页面 ${pg.id}`, pg.slug)
      }
    }
  }
  return index
}

/**
 * GET /api/media?cursor=&limit= (admin) — the media library: every stored
 * image plus where it is used. `cursor`/`hasMore` drive paging (the Vercel
 * Blob SDK is cursor-based; the local folder lists everything at once).
 */
mediaRoutes.get('/', requireAdmin, async (c) => {
  try {
    const repo = await getImagesRepo()
    const limit = normaliseLimit(c.req.query('limit'), 100, 500)
    const cursor = c.req.query('cursor') || undefined
    const { items, cursor: next, hasMore } = await repo.list({ cursor, limit })
    const usage = await buildUsageIndex(items.map((i) => i.url))
    return c.json({
      ok: true,
      data: items.map((it) => ({ ...it, usedIn: usage.get(it.url) || [] })),
      cursor: next ?? null,
      hasMore: !!hasMore,
    })
  } catch (e) {
    console.error('GET /api/media error:', e)
    return c.json({ ok: false, error: e.message || '媒体库加载失败' }, 500)
  }
})

/**
 * DELETE /api/media?url= (admin) — permanently removes an image from the
 * store. In-use images are deletable on purpose (the UI warns and lists the
 * references first) so the admin can still purge and re-upload.
 */
mediaRoutes.delete('/', requireAdmin, async (c) => {
  const url = c.req.query('url')
  if (!url) return c.json({ ok: false, error: '缺少 url 参数', code: 'BAD_REQUEST' }, 400)
  try {
    const repo = await getImagesRepo()
    await repo.remove(url)
    return c.json({ ok: true, data: { deleted: url } })
  } catch (e) {
    console.error('DELETE /api/media error:', e)
    return c.json({ ok: false, error: e.message || '删除失败' }, 500)
  }
})
