import { neon } from '@neondatabase/serverless'
import { parseList, fmtDate, today, normaliseLimit, normaliseOffset } from '../utils.js'

function sql() {
  return neon(process.env.DATABASE_URL)
}

/**
 * Moments support multiple images. `images` (JSON array) is the source of truth;
 * the legacy single `image` column is kept in sync for backwards compatibility.
 */
function parseImages(row) {
  const list = parseList(row.images)
  if (!list.length && row.image) return [row.image]
  return list
}

function parse(row) {
  const images = parseImages(row)
  return {
    id: row.id,
    date: fmtDate(row.date),
    time: row.time,
    content: row.content,
    images,
    image: images[0] || null,
    tags: parseList(row.tags),
    hidden: !!row.hidden,
  }
}

export const vercelMomentsRepo = {
  /**
   * Filtering happens in JS rather than in SQL (`WHERE hidden IS NOT TRUE`) so
   * this keeps working on a database where the `hidden` column has not been
   * migrated yet — SELECT * just omits the field and nothing is filtered out.
   * Pagination is therefore applied after filtering, in memory. Moments are
   * small (short text + image URLs), so this stays cheap.
   */
  async getAll({ limit, offset = 0, includeHidden = false } = {}) {
    const lim = normaliseLimit(limit, null, 100)
    const off = normaliseOffset(offset)
    const rows = await sql()`SELECT * FROM moments ORDER BY date DESC, time DESC`
    let moments = rows.map(parse)
    if (!includeHidden) moments = moments.filter(m => !m.hidden)
    if (lim) return moments.slice(off, off + lim)
    return off ? moments.slice(off) : moments
  },

  /** How many moments are currently hidden (used to decide whether to show the unlock button). */
  async countHidden() {
    const rows = await sql()`SELECT * FROM moments`
    return rows.filter(r => r.hidden === true).length
  },

  /** Total moments, optionally including hidden ones — used for pagination. */
  async count({ includeHidden = false } = {}) {
    const rows = await sql()`SELECT * FROM moments`
    return includeHidden ? rows.length : rows.filter(r => r.hidden !== true).length
  },

  async getById(id) {
    const rows = await sql()`SELECT * FROM moments WHERE id = ${id}`
    return rows.length ? parse(rows[0]) : null
  },

  async create(data) {
    const images = parseList(data.images ?? data.image)
    const rows = await sql()`
      INSERT INTO moments (date, time, content, image, images, tags, hidden)
      VALUES (
        ${data.date || today()},
        ${data.time || '00:00'},
        ${data.content || ''},
        ${images[0] || null},
        ${JSON.stringify(images)},
        ${JSON.stringify(parseList(data.tags))},
        ${!!data.hidden}
      )
      RETURNING *
    `
    return parse(rows[0])
  },

  async update(id, data) {
    const existing = await this.getById(id)
    if (!existing) return null
    const images = data.images !== undefined || data.image !== undefined
      ? parseList(data.images ?? data.image)
      : existing.images
    const rows = await sql()`
      UPDATE moments SET date    = ${data.date    ?? existing.date},
                         time    = ${data.time    ?? existing.time},
                         content = ${data.content ?? existing.content},
                         image   = ${images[0] || null},
                         images  = ${JSON.stringify(images)},
                         tags    = ${JSON.stringify(data.tags ?? existing.tags)},
                         hidden  = ${data.hidden !== undefined ? !!data.hidden : !!existing.hidden}
      WHERE id = ${id} RETURNING *
    `
    return rows.length ? parse(rows[0]) : null
  },

  async delete(id) {
    const rows = await sql()`DELETE FROM moments WHERE id = ${id} RETURNING id`
    return rows.length ? { deleted: true } : null
  },

  /**
   * Bulk-set the `hidden` flag in a single statement. Ids are expanded into
   * individual placeholders rather than passed as an array so the driver does
   * not have to infer a Postgres array type. Unknown ids are simply not matched.
   */
  async setHiddenMany(ids, hidden) {
    const list = (ids || []).map(Number).filter(Number.isFinite)
    if (!list.length) return { updated: 0 }
    const placeholders = list.map((_, i) => `$${i + 2}`).join(', ')
    const rows = await sql().query(
      `UPDATE moments SET hidden = $1 WHERE id IN (${placeholders}) RETURNING id`,
      [!!hidden, ...list],
    )
    return { updated: rows.length }
  },

  /** Bulk delete in a single statement. */
  async deleteMany(ids) {
    const list = (ids || []).map(Number).filter(Number.isFinite)
    if (!list.length) return { deleted: 0 }
    const placeholders = list.map((_, i) => `$${i + 1}`).join(', ')
    const rows = await sql().query(
      `DELETE FROM moments WHERE id IN (${placeholders}) RETURNING id`,
      list,
    )
    return { deleted: rows.length }
  },
}
