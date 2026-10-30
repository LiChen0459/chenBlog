import { writeFile, mkdir, readdir, stat, unlink, readFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'public', 'uploads')
const META_FILE = join(__dirname, '..', '..', 'data', 'media-meta.json')

async function readMetaMap() {
  try {
    const raw = await readFile(META_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {}
  return {}
}

async function writeMetaMap(map) {
  await writeFile(META_FILE, JSON.stringify(map, null, 2), 'utf-8')
}

function normalizeMeta(raw) {
  const tags = Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean).slice(0, 20) : []
  const group = String(raw?.group ?? raw?.grp ?? '').trim().slice(0, 40)
  return { tags, group, updated_at: raw?.updated_at || new Date().toISOString() }
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

/** Keep only a safe, short extension — never trust the client filename. */
function safeExt(file) {
  const fromMime = EXT_BY_MIME[file.type]
  if (fromMime) return fromMime
  const fromName = String(file.name || '').split('.').pop() || ''
  return /^[a-z0-9]{1,5}$/i.test(fromName) ? fromName.toLowerCase() : 'jpg'
}

/** `/uploads/abc.jpg` → `abc.jpg`; rejects anything that is not a bare filename. */
function safeName(url) {
  const decoded = decodeURIComponent(String(url || ''))
  const name = decoded.startsWith('/uploads/')
    ? decoded.slice('/uploads/'.length)
    : decoded.startsWith('uploads/')
      ? decoded.slice('uploads/'.length)
      : ''
  if (!name || name === '.' || name === '..' || name !== basename(name) || name.includes('/') || name.includes('\\')) return null
  return name
}

export const fileImagesRepo = {
  async upload(file) {
    await mkdir(UPLOAD_DIR, { recursive: true })
    const filename = `${crypto.randomBytes(8).toString('hex')}.${safeExt(file)}`
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()))
    return { url: `/uploads/${filename}` }
  },

  /** Files are listed newest first and paged with a numeric offset cursor. */
  async list({ cursor, limit = 100 } = {}) {
    let names = []
    try { names = await readdir(UPLOAD_DIR) } catch { return { items: [], hasMore: false } }
    const rows = await Promise.all(names.map(async (name) => {
      try {
        const st = await stat(join(UPLOAD_DIR, name))
        if (!st.isFile()) return null
        return {
          url: `/uploads/${name}`,
          pathname: `uploads/${name}`,
          size: st.size,
          uploadedAt: st.mtime.toISOString(),
        }
      } catch { return null }
    }))
    const items = rows
      .filter(Boolean)
      .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))
    const lim = Number(limit) > 0 ? Math.min(Number(limit), 500) : 100
    const offset = Math.max(0, Number.parseInt(cursor, 10) || 0)
    const page = items.slice(offset, offset + lim)
    const hasMore = offset + page.length < items.length
    return { items: page, cursor: hasMore ? String(offset + page.length) : null, hasMore }
  },

  async remove(url) {
    const name = safeName(url)
    if (!name) {
      const err = new Error('非法的图片路径')
      err.status = 400
      err.code = 'BAD_REQUEST'
      throw err
    }
    await unlink(join(UPLOAD_DIR, name))
    return { deleted: url }
  },

  /** Total file count and combined size across the whole uploads folder. */
  async summarize() {
    let names = []
    try { names = await readdir(UPLOAD_DIR) } catch { return { count: 0, size: 0 } }
    let count = 0
    let size = 0
    for (const name of names) {
      try {
        const st = await stat(join(UPLOAD_DIR, name))
        if (st.isFile()) { count++; size += st.size }
      } catch {}
    }
    return { count, size }
  },

  /** Get metadata for a list of URLs. Returns a Map(url → {tags,group}). */
  async getMetas(urls) {
    const map = await readMetaMap()
    const out = new Map()
    for (const url of urls) out.set(url, normalizeMeta(map[url]))
    return out
  },

  /** Upsert metadata for a single image URL. */
  async setMeta(url, patch) {
    const map = await readMetaMap()
    const existing = normalizeMeta(map[url] || {})
    const next = {
      tags: patch.tags !== undefined ? patch.tags : existing.tags,
      group: patch.group !== undefined ? patch.group : existing.group,
      updated_at: new Date().toISOString(),
    }
    map[url] = next
    await writeMetaMap(map)
    return { url, ...next }
  },

  /** Distinct non-empty groups across the whole store. */
  async listGroups() {
    const map = await readMetaMap()
    const groups = new Set()
    for (const m of Object.values(map)) {
      const g = String(m?.group ?? m?.grp ?? '').trim()
      if (g) groups.add(g)
    }
    return [...groups].sort()
  },
}
