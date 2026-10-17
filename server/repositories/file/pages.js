import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { today } from '../utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'pages.json')

/** Slugs are URL-safe, lowercase and short — they end up in /page/<slug>. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function isValidSlug(slug) {
  return SLUG_RE.test(String(slug || ''))
}

/** Normalise anything into a slug-shaped string ('' when it cannot be salvaged). */
export function normaliseSlug(raw) {
  const s = String(raw || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return isValidSlug(s) ? s : ''
}

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

async function writeAll(pages) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(pages, null, 2), 'utf-8')
}

function parse(page) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title || '未命名页面',
    content: page.content || '',
    created_at: page.created_at || '',
    updated_at: page.updated_at || page.created_at || '',
  }
}

function sortPages(a, b) {
  return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN')
}

export const filePagesRepo = {
  async getAll() {
    return (await readAll()).map(parse).sort(sortPages)
  },

  async getBySlug(slug) {
    const page = (await readAll()).find((p) => String(p.slug) === String(slug))
    return page ? parse(page) : null
  },

  async create(data) {
    const slug = normaliseSlug(data.slug)
    if (!slug) throw new Error('无效的页面地址（只能用英文小写字母、数字和连字符）')
    const pages = await readAll()
    if (pages.some((p) => String(p.slug) === slug)) {
      throw new Error(`页面地址 /${slug} 已被占用`)
    }
    const now = new Date().toISOString()
    const id = pages.length > 0 ? Math.max(...pages.map((p) => Number(p.id) || 0)) + 1 : 1
    const page = {
      id,
      slug,
      title: data.title || '未命名页面',
      content: data.content || '',
      created_at: now,
      updated_at: now,
    }
    pages.push(page)
    await writeAll(pages)
    return parse(page)
  },

  async update(slug, data) {
    const pages = await readAll()
    const idx = pages.findIndex((p) => String(p.slug) === String(slug))
    if (idx === -1) return null
    const current = pages[idx]
    const next = { ...current }
    if (data.title !== undefined) next.title = data.title || current.title
    if (data.content !== undefined) next.content = data.content
    if (data.slug !== undefined) {
      const clean = normaliseSlug(data.slug)
      if (!clean) throw new Error('无效的页面地址（只能用英文小写字母、数字和连字符）')
      if (clean !== current.slug && pages.some((p) => String(p.slug) === clean)) {
        throw new Error(`页面地址 /${clean} 已被占用`)
      }
      next.slug = clean
    }
    next.updated_at = new Date().toISOString()
    pages[idx] = next
    await writeAll(pages)
    return parse(next)
  },

  async delete(slug) {
    const pages = await readAll()
    const kept = pages.filter((p) => String(p.slug) !== String(slug))
    if (kept.length === pages.length) return null
    await writeAll(kept)
    return { deleted: true }
  },
}
