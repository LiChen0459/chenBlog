/**
 * Create tables in Neon Postgres.
 * Run: DATABASE_URL=postgres://... node server/db/migrate.js
 */
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL environment variable is required.')
  process.exit(1)
}

const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS posts (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    date       DATE NOT NULL DEFAULT CURRENT_DATE,
    summary    TEXT DEFAULT '',
    content    TEXT DEFAULT '',
    tags       TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS moments (
    id         SERIAL PRIMARY KEY,
    date       DATE NOT NULL DEFAULT CURRENT_DATE,
    time       TEXT NOT NULL,
    content    TEXT NOT NULL,
    image      TEXT,
    tags       TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

console.log('✅ Database migrated — posts + moments tables ready.')
process.exit(0)
