import { neon } from '@neondatabase/serverless'

function sql() {
  return neon(process.env.DATABASE_URL)
}

/** Simple key → string store, backed by the `settings` table. */
export const vercelSettingsRepo = {
  async get(key) {
    try {
      const rows = await sql()`SELECT value FROM settings WHERE key = ${key}`
      return rows.length ? rows[0].value : null
    } catch {
      // Table not migrated yet — behave as "unset" rather than breaking reads.
      return null
    }
  },

  async set(key, value) {
    await sql()`
      INSERT INTO settings (key, value, updated_at)
      VALUES (${key}, ${String(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `
    return true
  },

  async delete(key) {
    const rows = await sql()`DELETE FROM settings WHERE key = ${key} RETURNING key`
    return rows.length > 0
  },
}
