import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseList, fmtDate, today, normaliseLimit, normaliseOffset, buildTaxonomy } from '../utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'posts.json')

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function readAll() {
  await ensureDir()
  try {
    const raw = await readFile(FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(posts) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(posts, null, 2), 'utf-8')
}

/**
 * @param {object} post
 * @param {boolean} withContent when false the full markdown body is omitted —
 *   list views only need the summary.
 */
function parse(post, withContent = true) {
  const out = {
    id: post.id,
    title: post.title || '无标题',
    date: fmtDate(post.date),
    summary: post.summary || '',
    category: post.category || '',
    tags: parseList(post.tags),
    pinned: !!post.pinned,
  }
  if (withContent) out.content = post.content || ''
  return out
}

/** Pinned first, then newest first. */
function sortPosts(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
  return String(b.date).localeCompare(String(a.date))
}

export const filePostsRepo = {
  /** `withContent` defaults to true — see the note in vercel/posts.js. */
  async getAll({ limit, offset = 0, withContent = true, category, tag, year } = {}) {
    const lim = normaliseLimit(limit, null, 200)
    const off = normaliseOffset(offset)
    let posts = (await readAll()).map(p => parse(p, withContent)).sort(sortPosts)
    if (category) posts = posts.filter(p => p.category === category)
    if (tag) posts = posts.filter(p => (p.tags || []).includes(tag))
    if (year) posts = posts.filter(p => String(p.date).startsWith(String(year)))
    if (lim) return posts.slice(off, off + lim)
    return off ? posts.slice(off) : posts
  },

  /** Total number of posts (honouring the same filters as getAll) — used for pagination metadata. */
  async count({ category, tag, year } = {}) {
    let posts = await readAll()
    if (category) posts = posts.filter(p => String(p.category || '') === category)
    if (tag) posts = posts.filter(p => parseList(p.tags).includes(tag))
    if (year) posts = posts.filter(p => String(p.date || '').startsWith(String(year)))
    return posts.length
  },

  /**
   * Naive-but-good-enough full-text search (the blog has tens of posts, not
   * millions): case-insensitive substring match over title / summary / body /
   * tags / category, scored so title hits rank first.
   */
  async search(q, { limit = 20 } = {}) {
    const needle = String(q || '').trim().toLowerCase()
    if (!needle) return []
    const lim = normaliseLimit(limit, 20, 100)
    const scored = []
    for (const raw of await readAll()) {
      const p = parse(raw, true)
      const hay = {
        title: p.title.toLowerCase(),
        summary: p.summary.toLowerCase(),
        content: p.content.toLowerCase(),
        tags: (p.tags || []).join(' ').toLowerCase(),
        category: p.category.toLowerCase(),
      }
      let score = 0
      if (hay.title.includes(needle)) score += 10
      if (hay.tags.includes(needle) || hay.category.includes(needle)) score += 5
      if (hay.summary.includes(needle)) score += 3
      if (hay.content.includes(needle)) score += 1
      if (score) scored.push({ post: p, score })
    }
    scored.sort((a, b) => b.score - a.score || String(b.post.date).localeCompare(String(a.post.date)))
    return scored.slice(0, lim).map((s) => s.post)
  },

  /** Category tree + tag cloud with counts. */
  async taxonomy() {
    return buildTaxonomy(await readAll())
  },

  async getById(id) {
    const post = (await readAll()).find(p => p.id === id)
    return post ? parse(post) : null
  },

  async create(data) {
    const posts = await readAll()
    const id = posts.length > 0 ? Math.max(...posts.map(p => Number(p.id) || 0)) + 1 : 1
    const post = {
      id,
      title: data.title || '无标题',
      date: data.date || today(),
      summary: data.summary || '',
      category: data.category || '',
      content: data.content || '',
      tags: parseList(data.tags),
      pinned: !!data.pinned,
    }
    posts.push(post)
    await writeAll(posts)
    return parse(post)
  },

  async update(id, data) {
    const posts = await readAll()
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return null
    const current = posts[idx]
    // Never let the request body rewrite the primary key.
    posts[idx] = {
      ...current,
      title: data.title ?? current.title,
      date: data.date ?? current.date,
      summary: data.summary ?? current.summary,
      category: data.category ?? current.category ?? '',
      content: data.content ?? current.content,
      tags: data.tags !== undefined ? parseList(data.tags) : parseList(current.tags),
      pinned: data.pinned !== undefined ? !!data.pinned : !!current.pinned,
    }
    await writeAll(posts)
    return parse(posts[idx])
  },

  async togglePin(id) {
    const posts = await readAll()
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return null
    posts[idx].pinned = !posts[idx].pinned
    await writeAll(posts)
    return { pinned: !!posts[idx].pinned }
  },

  async delete(id) {
    const posts = await readAll()
    const filtered = posts.filter(p => p.id !== id)
    if (filtered.length === posts.length) return null
    await writeAll(filtered)
    return { deleted: true }
  },

  /**
   * Bulk-set `pinned`. Unknown ids are ignored rather than erroring — a stale
   * selection in the admin UI should not fail the whole batch.
   */
  async setPinnedMany(ids, pinned) {
    const set = new Set((ids || []).map(Number).filter(Number.isFinite))
    if (!set.size) return { updated: 0 }
    const posts = await readAll()
    let updated = 0
    const next = posts.map((p) => {
      if (!set.has(Number(p.id))) return p
      updated++
      return { ...p, pinned: !!pinned }
    })
    if (updated) await writeAll(next)
    return { updated }
  },

  /** Bulk delete. Returns how many rows were actually removed. */
  async deleteMany(ids) {
    const set = new Set((ids || []).map(Number).filter(Number.isFinite))
    if (!set.size) return { deleted: 0 }
    const posts = await readAll()
    const kept = posts.filter(p => !set.has(Number(p.id)))
    const deleted = posts.length - kept.length
    if (deleted) await writeAll(kept)
    return { deleted }
  },
}
