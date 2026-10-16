import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseList, fmtDate, today, normaliseLimit, normaliseOffset } from '../utils.js'

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
  async getAll({ limit, offset = 0, withContent = true } = {}) {
    const lim = normaliseLimit(limit, null, 200)
    const off = normaliseOffset(offset)
    const posts = (await readAll()).map(p => parse(p, withContent)).sort(sortPosts)
    if (lim) return posts.slice(off, off + lim)
    return off ? posts.slice(off) : posts
  },

  /** Total number of posts — used for pagination metadata. */
  async count() {
    return (await readAll()).length
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
