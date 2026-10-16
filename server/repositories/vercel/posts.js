import { neon } from '@neondatabase/serverless'
import { parseList, fmtDate, today, normaliseLimit, normaliseOffset } from '../utils.js'

// Create a fresh SQL client on each call to avoid Vercel serverless connection reuse issues
function sql() {
  return neon(process.env.DATABASE_URL)
}

const LIST_COLS = 'id, title, date, summary, tags, pinned'
const FULL_COLS = `${LIST_COLS}, content`

/**
 * @param {object} row
 * @param {boolean} withContent when false the `content` column is not selected,
 *   so the key is simply absent — list views never need the full markdown body.
 */
function parse(row, withContent = true) {
  const post = {
    id: row.id,
    title: row.title,
    date: fmtDate(row.date),
    summary: row.summary || '',
    tags: parseList(row.tags),
    pinned: !!row.pinned,
  }
  if (withContent) post.content = row.content || ''
  return post
}

export const vercelPostsRepo = {
  /**
   * `withContent` defaults to true so a forgotten call site degrades to
   * "slower but correct" rather than silently returning empty bodies.
   * List endpoints opt in to the lean projection explicitly.
   */
  async getAll({ limit, offset = 0, withContent = true } = {}) {
    const lim = normaliseLimit(limit, null, 200)
    const off = normaliseOffset(offset)

    const params = []
    let text = `SELECT ${withContent ? FULL_COLS : LIST_COLS} FROM posts ORDER BY pinned DESC, date DESC`
    if (lim) { params.push(lim); text += ` LIMIT $${params.length}` }
    if (off) { params.push(off); text += ` OFFSET $${params.length}` }

    const rows = await sql().query(text, params)
    return rows.map((r) => parse(r, withContent))
  },

  /** Total number of posts — used for pagination metadata. */
  async count() {
    const rows = await sql()`SELECT COUNT(*)::int AS n FROM posts`
    return rows[0]?.n || 0
  },

  async getById(id) {
    const rows = await sql()`SELECT * FROM posts WHERE id = ${id}`
    return rows.length ? parse(rows[0], true) : null
  },

  async create(data) {
    const rows = await sql()`
      INSERT INTO posts (title, date, summary, content, tags)
      VALUES (
        ${data.title || '无标题'},
        ${data.date || today()},
        ${data.summary || ''},
        ${data.content || ''},
        ${JSON.stringify(parseList(data.tags))}
      )
      RETURNING *
    `
    return parse(rows[0], true)
  },

  async update(id, data) {
    const existing = await this.getById(id)
    if (!existing) return null
    const rows = await sql()`
      UPDATE posts SET title   = ${data.title   ?? existing.title},
                       date    = ${data.date    ?? existing.date},
                       summary = ${data.summary ?? existing.summary},
                       content = ${data.content ?? existing.content},
                       tags    = ${JSON.stringify(data.tags ?? existing.tags)}
      WHERE id = ${id} RETURNING *
    `
    return parse(rows[0], true)
  },

  async togglePin(id) {
    const rows = await sql()`
      UPDATE posts SET pinned = NOT COALESCE(pinned, FALSE) WHERE id = ${id} RETURNING pinned
    `
    if (!rows.length) return null
    return { pinned: !!rows[0].pinned }
  },

  async delete(id) {
    const rows = await sql()`DELETE FROM posts WHERE id = ${id} RETURNING id`
    return rows.length ? { deleted: true } : null
  },

  /**
   * Bulk-set `pinned` in a single statement. Ids are expanded into individual
   * placeholders rather than passed as an array so the driver does not have to
   * infer a Postgres array type. Unknown ids are simply not matched.
   */
  async setPinnedMany(ids, pinned) {
    const list = (ids || []).map(Number).filter(Number.isFinite)
    if (!list.length) return { updated: 0 }
    const placeholders = list.map((_, i) => `$${i + 2}`).join(', ')
    const rows = await sql().query(
      `UPDATE posts SET pinned = $1 WHERE id IN (${placeholders}) RETURNING id`,
      [!!pinned, ...list],
    )
    return { updated: rows.length }
  },

  /** Bulk delete in a single statement. */
  async deleteMany(ids) {
    const list = (ids || []).map(Number).filter(Number.isFinite)
    if (!list.length) return { deleted: 0 }
    const placeholders = list.map((_, i) => `$${i + 1}`).join(', ')
    const rows = await sql().query(
      `DELETE FROM posts WHERE id IN (${placeholders}) RETURNING id`,
      list,
    )
    return { deleted: rows.length }
  },
}
