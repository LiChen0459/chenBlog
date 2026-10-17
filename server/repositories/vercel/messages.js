import { neon } from '@neondatabase/serverless'
import { fmtDate, normaliseLimit, normaliseOffset, MAX_NICKNAME_LEN, MAX_MESSAGE_LEN } from '../utils.js'

// Create a fresh SQL client on each call to avoid Vercel serverless connection reuse issues
function sql() {
  return neon(process.env.DATABASE_URL)
}

/** Split the timestamp into the date + time pair the frontend renders. */
function parse(row) {
  const iso = row.created_at ? new Date(row.created_at).toISOString() : ''
  const d = new Date(iso)
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return {
    id: row.id,
    nickname: row.nickname || '匿名',
    content: row.content || '',
    hidden: !!row.hidden,
    created_at: iso,
    date: fmtDate(row.created_at),
    time,
  }
}

export const vercelMessagesRepo = {
  /** Newest first. Hidden messages are only visible to the admin (see routes). */
  async getAll({ limit, offset = 0, includeHidden = false } = {}) {
    const lim = normaliseLimit(limit, null, 200)
    const off = normaliseOffset(offset)
    const params = []
    let text = 'SELECT * FROM messages'
    if (!includeHidden) text += ' WHERE hidden IS NOT TRUE'
    text += ' ORDER BY created_at DESC'
    if (lim) { params.push(lim); text += ` LIMIT $${params.length}` }
    if (off) { params.push(off); text += ` OFFSET $${params.length}` }
    const rows = await sql().query(text, params)
    return rows.map(parse)
  },

  async count({ includeHidden = false } = {}) {
    const text = includeHidden
      ? 'SELECT COUNT(*)::int AS n FROM messages'
      : 'SELECT COUNT(*)::int AS n FROM messages WHERE hidden IS NOT TRUE'
    const rows = await sql().query(text, [])
    return rows[0]?.n || 0
  },

  async create(data) {
    const rows = await sql()`
      INSERT INTO messages (nickname, content)
      VALUES (${String(data.nickname ?? '').slice(0, MAX_NICKNAME_LEN) || '匿名'},
              ${String(data.content ?? '').slice(0, MAX_MESSAGE_LEN)})
      RETURNING *
    `
    return parse(rows[0])
  },

  async setHidden(id, hidden) {
    const rows = await sql()`
      UPDATE messages SET hidden = ${!!hidden} WHERE id = ${id} RETURNING hidden
    `
    if (!rows.length) return null
    return { hidden: !!rows[0].hidden }
  },

  async delete(id) {
    const rows = await sql()`DELETE FROM messages WHERE id = ${id} RETURNING id`
    return rows.length ? { deleted: true } : null
  },
}
