import { writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'public', 'uploads')

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
  const name = basename(decodeURIComponent(String(url || '')).replace(/^\/?uploads\//, ''))
  if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) return null
  return name
}

export const fileImagesRepo = {
  async upload(file) {
    await mkdir(UPLOAD_DIR, { recursive: true })
    const filename = `${crypto.randomBytes(8).toString('hex')}.${safeExt(file)}`
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()))
    return { url: `/uploads/${filename}` }
  },

  /** Every file in public/uploads, newest first. No cursor — one flat folder. */
  async list({ limit = 100 } = {}) {
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
    return { items: items.slice(0, lim), hasMore: false }
  },

  async remove(url) {
    const name = safeName(url)
    if (!name) throw new Error('非法的图片路径')
    await unlink(join(UPLOAD_DIR, name))
    return { deleted: url }
  },
}
