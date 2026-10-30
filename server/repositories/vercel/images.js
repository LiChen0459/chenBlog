import { put, list, del } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'
import { safeExt } from '../utils.js'

function sql() {
  return neon(process.env.DATABASE_URL)
}

/**
 * `media_meta` may not exist yet on a database that has not been migrated.
 * Reads must never 500 because of it (same rule as the moments `hidden`
 * filter), so the schema is created lazily on the write path instead.
 */
let metaTableReady = false
async function ensureMetaTable() {
  if (metaTableReady) return
  await sql()`
    CREATE TABLE IF NOT EXISTS media_meta (
      url        TEXT PRIMARY KEY,
      tags       TEXT DEFAULT '[]',
      grp        TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  metaTableReady = true
}

/**
 * The Blob token only exists in Vercel's env. A local `.env` that sets
 * `DATABASE_URL` points the whole app at the live store — images included —
 * so it is easy to run the media library without this token. The SDK's own
 * error ("No token found") does not say what to do, so fail early with the
 * two ways out: add the token, or switch to local file storage.
 */
function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    const err = new Error(
      'BLOB_READ_WRITE_TOKEN 未配置：本地 .env 设了 DATABASE_URL 时，图片也会走线上 Vercel Blob，' +
        '需要在 .env 里补上这个 token（Vercel 控制台 → 存储 → Blob → .env.local 可复制），' +
        '或者改用 npm run dev:server:local 走本地 public/uploads。'
    )
    err.code = 'BLOB_TOKEN_MISSING'
    throw err
  }
  return token
}

export const vercelImagesRepo = {
  async upload(file) {
    const ext = safeExt(file)
    const name = `moments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { url } = await put(name, file, {
      access: 'public',
      contentType: file.type || undefined,
      token: blobToken(),
    })
    return { url }
  },

  /**
   * Every blob in the store, newest first (the SDK's default ordering).
   * `cursor` continues a previous page; both are returned for the next call.
   */
  async list({ cursor, limit = 100 } = {}) {
    const res = await list({
      limit: Math.min(Math.max(Number(limit) || 100, 1), 500),
      ...(cursor ? { cursor } : {}),
      token: blobToken(),
    })
    return {
      items: (res.blobs || []).map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
      cursor: res.cursor ?? null,
      hasMore: !!res.hasMore,
    }
  },

  async remove(url) {
    if (!/^https?:\/\//.test(String(url || ''))) {
      throw new Error('非法的图片地址')
    }
    await del(url, { token: blobToken() })
    return { deleted: url }
  },

  /** Total blob count and combined size across the entire store (walks pages). */
  async summarize() {
    let count = 0
    let size = 0
    let cursor
    do {
      const res = await list({
        limit: 1000,
        ...(cursor ? { cursor } : {}),
        token: blobToken(),
      })
      for (const b of res.blobs || []) {
        count++
        size += b.size || 0
      }
      cursor = res.hasMore ? res.cursor : undefined
    } while (cursor)
    return { count, size }
  },

  /** Get metadata for a list of URLs. Returns a Map(url → {tags,group}). */
  async getMetas(urls) {
    if (!urls || !urls.length) return new Map()
    try {
      const placeholders = urls.map((_, i) => `$${i + 1}`).join(', ')
      const rows = await sql().query(
        `SELECT url, tags, grp FROM media_meta WHERE url IN (${placeholders})`,
        urls,
      )
      const out = new Map()
      for (const r of rows) {
        let tags = []
        try { tags = JSON.parse(r.tags || '[]') } catch {}
        out.set(r.url, { tags, group: r.grp || '', updated_at: r.updated_at })
      }
      // Ensure every requested URL gets at least an empty record.
      for (const u of urls) if (!out.has(u)) out.set(u, { tags: [], group: '', updated_at: null })
      return out
    } catch (e) {
      // Table missing / not migrated — the library must still render.
      console.error('getMetas fallback:', e.message)
      return new Map(urls.map((u) => [u, { tags: [], group: '', updated_at: null }]))
    }
  },

  /** Upsert metadata for a single image URL. */
  async setMeta(url, patch) {
    await ensureMetaTable()
    const tags = Array.isArray(patch.tags) ? JSON.stringify(patch.tags.map(String).filter(Boolean).slice(0, 20)) : '[]'
    const group = String(patch.group !== undefined ? patch.group : '').trim().slice(0, 40)
    await sql()`
      INSERT INTO media_meta (url, tags, grp, updated_at)
      VALUES (${url}, ${tags}, ${group}, NOW())
      ON CONFLICT (url) DO UPDATE SET
        tags = EXCLUDED.tags,
        grp  = EXCLUDED.grp,
        updated_at = NOW()
    `
    return { url, tags: JSON.parse(tags), group, updated_at: new Date().toISOString() }
  },

  /** Distinct non-empty groups across the whole store. */
  async listGroups() {
    try {
      const rows = await sql()`SELECT DISTINCT grp FROM media_meta WHERE grp <> ''`
      return rows.map((r) => r.grp).sort()
    } catch {
      return []
    }
  },
}
