import { neon } from '@neondatabase/serverless'

// Create a fresh SQL client on each call to avoid Vercel serverless connection reuse issues
function sql() {
  return neon(process.env.DATABASE_URL)
}

function fmt(d) {
  if (!d) return ''
  const s = new Date(d).toISOString()
  return s.slice(0, 10)
}

function parse(row) {
  return {
    id: row.id, title: row.title, date: fmt(row.date),
    summary: row.summary, content: row.content,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
    pinned: !!row.pinned,
  }
}

export const vercelPostsRepo = {
  async getAll({ limit } = {}) {
    const rows = limit
      ? await sql()`SELECT * FROM posts ORDER BY pinned DESC, date DESC LIMIT ${limit}`
      : await sql()`SELECT * FROM posts ORDER BY pinned DESC, date DESC`
    return rows.map(parse)
  },

  async togglePin(id) {
    const existing = await sql()`SELECT pinned FROM posts WHERE id = ${id}`
    if (!existing.length) return null
    const newVal = !existing[0].pinned
    await sql()`UPDATE posts SET pinned = ${newVal} WHERE id = ${id}`
    return { pinned: newVal }
  },

  async getById(id) {
    const rows = await sql()`SELECT * FROM posts WHERE id = ${id}`
    return rows.length ? parse(rows[0]) : null
  },

  async create(data) {
    const tags = JSON.stringify(data.tags || [])
    const rows = await sql()`
      INSERT INTO posts (title, date, summary, content, tags)
      VALUES (${data.title}, ${data.date}, ${data.summary}, ${data.content}, ${tags})
      RETURNING *
    `
    return parse(rows[0])
  },

  async update(id, data) {
    const existing = await this.getById(id)
    if (!existing) return null
    const tags = JSON.stringify(data.tags ?? existing.tags)
    const rows = await sql()`
      UPDATE posts SET title = ${data.title ?? existing.title},
        date = ${data.date ?? existing.date},
        summary = ${data.summary ?? existing.summary},
        content = ${data.content ?? existing.content},
        tags = ${tags}
      WHERE id = ${id} RETURNING *
    `
    return parse(rows[0])
  },

  async delete(id) {
    await sql()`DELETE FROM posts WHERE id = ${id}`
    return { deleted: true }
  },
}
