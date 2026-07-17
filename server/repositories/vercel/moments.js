import { neon } from '@neondatabase/serverless'

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
    id: row.id, date: fmt(row.date), time: row.time,
    content: row.content, image: row.image,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
  }
}

export const vercelMomentsRepo = {
  async getAll({ limit } = {}) {
    const rows = limit
      ? await sql()`SELECT * FROM moments ORDER BY date DESC, time DESC LIMIT ${limit}`
      : await sql()`SELECT * FROM moments ORDER BY date DESC, time DESC`
    return rows.map(parse)
  },

  async create(data) {
    const tags = JSON.stringify(data.tags || [])
    const rows = await sql()`
      INSERT INTO moments (date, time, content, image, tags)
      VALUES (${data.date}, ${data.time}, ${data.content}, ${data.image ?? null}, ${tags})
      RETURNING *
    `
    return parse(rows[0])
  },

  async update(id, data) {
    const rows = await sql()`
      UPDATE moments SET date = ${data.date}, time = ${data.time},
        content = ${data.content}, image = ${data.image ?? null},
        tags = ${JSON.stringify(data.tags || [])}
      WHERE id = ${id} RETURNING *
    `
    return rows.length ? parse(rows[0]) : null
  },

  async delete(id) {
    await sql()`DELETE FROM moments WHERE id = ${id}`
    return { deleted: true }
  },
}
