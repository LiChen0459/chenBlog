/**
 * Shared helpers for the repository layer.
 */
import { randomBytes, scrypt, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

/** Parse a JSON-encoded array column (or an already-parsed array) into a clean array. */
export function parseList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/** Normalise a Postgres DATE value into `YYYY-MM-DD` without timezone drift. */
export function fmtDate(d) {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const t = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** `YYYY-MM-DD` for today, in local time. */
export function today() {
  return fmtDate(new Date())
}

/**
 * Build the category tree + tag cloud from a list of posts (any shape that
 * carries `category` / `tags`). A category path like "技术/前端/Vue" registers
 * every prefix node ("技术", "技术/前端", "技术/前端/Vue") so the archive can
 * render real hierarchy without a parent_id column.
 */
export function buildTaxonomy(posts) {
  const catMap = new Map()
  const tagMap = new Map()
  for (const p of posts || []) {
    const raw = String(p.category || '').trim()
    if (raw) {
      const parts = raw.split('/').map((s) => s.trim()).filter(Boolean)
      let path = ''
      for (const part of parts) {
        path = path ? `${path}/${part}` : part
        const node = catMap.get(path) || { path, name: part, count: 0 }
        node.count++
        catMap.set(path, node)
      }
    }
    for (const t of parseList(p.tags)) {
      tagMap.set(t, (tagMap.get(t) || 0) + 1)
    }
  }
  return {
    categories: [...catMap.values()].sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
    tags: [...tagMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }
}

/**
 * Escape LIKE/ILIKE wildcards in user input so "50%" does not match everything.
 * Use together with an explicit `ESCAPE '\'` clause.
 */
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Guestbook caps — cheap but effective spam containment. */
export const MAX_NICKNAME_LEN = 20
export const MAX_MESSAGE_LEN = 500

/**
 * Clamp a caller-supplied `limit` into a safe positive integer.
 * Returns `fallback` (null = "no limit") when absent/invalid.
 */
export function normaliseLimit(value, fallback = null, max = 100) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}

/** Clamp a caller-supplied `offset` into a safe non-negative integer. */
export function normaliseOffset(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

/**
 * Normalise a client-supplied id list for bulk operations: positive integers
 * only, de-duplicated, order preserved. Anything else is dropped rather than
 * throwing, so one bad entry cannot fail a whole batch.
 */
export function normaliseIds(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const raw of value) {
    const n = Number(raw)
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export const ALLOWED_IMAGE_TYPES = Object.keys(EXT_BY_MIME)
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

/** Keep only a safe, short extension — never trust the client filename. */
export function safeExt(file) {
  const fromMime = EXT_BY_MIME[file?.type]
  if (fromMime) return fromMime
  const fromName = String(file?.name || '').split('.').pop() || ''
  return /^[a-z0-9]{1,5}$/i.test(fromName) ? fromName.toLowerCase() : 'jpg'
}

/** Returns an error message, or null when the upload is acceptable. */
export function validateImage(file) {
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return '未选择图片文件'
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `不支持的图片格式：${file.type}`
  }
  if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) {
    return `图片过大（单张上限 ${MAX_IMAGE_BYTES / 1024 / 1024} MB）`
  }
  return null
}

/* ═══════════════════════════════════════════
   PASSWORD HASHING (scrypt)
   ═══════════════════════════════════════════ */

const SCRYPT_KEYLEN = 64

/** Hash a password into the self-describing string `scrypt$<saltHex>$<hashHex>`. */
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(String(password), salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Constant-time verification of a password against a stored `scrypt$...` hash. */
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  try {
    const expected = Buffer.from(hashHex, 'hex')
    if (!expected.length) return false
    const actual = await scryptAsync(String(password), Buffer.from(saltHex, 'hex'), expected.length)
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

/** Constant-time string comparison that tolerates unequal lengths. */
export function safeEqualString(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf-8')
  const bufB = Buffer.from(String(b ?? ''), 'utf-8')
  if (!bufA.length || !bufB.length || bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/* ═══════════════════════════════════════════
   SCOPED UNLOCK TOKENS
   Used to reveal hidden moments without ever handing the admin token to a
   public visitor. Signed with ADMIN_TOKEN so no extra env var is needed.
   ═══════════════════════════════════════════ */

const UNLOCK_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const UNLOCK_SCOPE = 'moments'

function unlockSecret() {
  return process.env.ADMIN_TOKEN || ''
}

/** Mint a signed token that grants access to hidden moments only. Null when unconfigured. */
export function signUnlockToken() {
  const secret = unlockSecret()
  if (!secret) return null
  const payload = Buffer.from(
    JSON.stringify({ s: UNLOCK_SCOPE, exp: Date.now() + UNLOCK_TTL_MS }),
  ).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** True when the token is well-formed, correctly signed, in scope and unexpired. */
export function verifyUnlockToken(token) {
  const secret = unlockSecret()
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false

  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return data.s === UNLOCK_SCOPE && typeof data.exp === 'number' && Date.now() < data.exp
  } catch {
    return false
  }
}

export const UNLOCK_TOKEN_TTL_MS = UNLOCK_TTL_MS

