import { neon } from '@neondatabase/serverless'
import { fmtDate } from '../utils.js'

// Create a fresh SQL client on each call to avoid Vercel serverless connection reuse issues
function sql() {
  return neon(process.env.DATABASE_URL)
}

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

function parse(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || '未命名页面',
    content: row.content || '',
    created_at: fmtDate(row.created_at),
    updated_at: fmtDate(row.updated_at || row.created_at),
  }
}

export const vercelPagesRepo = {
  async getAll() {
    const rows = await sql().query('SELECT * FROM pages ORDER BY title', [])
    return rows.map(parse)
  },

  async getBySlug(slug) {
    const rows = await sql()`SELECT * FROM pages WHERE slug = ${slug}`
    return rows.length ? parse(rows[0]) : null
  },

  async create(data) {
    const slug = normaliseSlug(data.slug)
    if (!slug) throw new Error('无效的页面地址（只能用英文小写字母、数字和连字符）')
    const existing = await sql()`SELECT id FROM pages WHERE slug = ${slug}`
    if (existing.length) throw new Error(`页面地址 /${slug} 已被占用`)
    const rows = await sql()`
      INSERT INTO pages (slug, title, content)
      VALUES (${slug}, ${data.title || '未命名页面'}, ${data.content || ''})
      RETURNING *
    `
    return parse(rows[0])
  },

  async update(slug, data) {
    const existing = await sql()`SELECT * FROM pages WHERE slug = ${slug}`
    if (!existing.length) return null
    const cur = parse(existing[0])

    let nextSlug = cur.slug
    if (data.slug !== undefined) {
      const clean = normaliseSlug(data.slug)
      if (!clean) throw new Error('无效的页面地址（只能用英文小写字母、数字和连字符）')
      if (clean !== cur.slug) {
        const clash = await sql()`SELECT id FROM pages WHERE slug = ${clean}`
        if (clash.length) throw new Error(`页面地址 /${clean} 已被占用`)
        nextSlug = clean
      }
    }

    const rows = await sql()`
      UPDATE pages SET title = ${data.title ?? cur.title},
                       content = ${data.content ?? cur.content},
                       slug = ${nextSlug},
                       updated_at = NOW()
      WHERE id = ${cur.id} RETURNING *
    `
    return parse(rows[0])
  },

  async delete(slug) {
    const rows = await sql()`DELETE FROM pages WHERE slug = ${slug} RETURNING id`
    return rows.length ? { deleted: true } : null
  },
}
