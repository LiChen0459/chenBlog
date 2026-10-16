import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
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

export const fileImagesRepo = {
  async upload(file) {
    await mkdir(UPLOAD_DIR, { recursive: true })
    const filename = `${crypto.randomBytes(8).toString('hex')}.${safeExt(file)}`
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()))
    return { url: `/uploads/${filename}` }
  },
}
