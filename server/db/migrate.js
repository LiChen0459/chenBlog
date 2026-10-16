/**
 * Create / upgrade tables in Neon Postgres.
 * Run: DATABASE_URL=postgres://... node server/db/migrate.js
 *
 * Safe to run multiple times — every statement is idempotent.
 */
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL environment variable is required.')
  process.exit(1)
}

const sql = neon(url)

/* ── Tables ── */
await sql`
  CREATE TABLE IF NOT EXISTS posts (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    date       DATE NOT NULL DEFAULT CURRENT_DATE,
    summary    TEXT DEFAULT '',
    content    TEXT DEFAULT '',
    tags       TEXT DEFAULT '[]',
    pinned     BOOLEAN DEFAULT FALSE,
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
    images     TEXT DEFAULT '[]',
    tags       TEXT DEFAULT '[]',
    hidden     BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`

/* ── Upgrade databases created by an older version ── */
await sql`ALTER TABLE posts   ADD COLUMN IF NOT EXISTS tags   TEXT    DEFAULT '[]'`
await sql`ALTER TABLE posts   ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE`
await sql`ALTER TABLE moments ADD COLUMN IF NOT EXISTS tags   TEXT    DEFAULT '[]'`
await sql`ALTER TABLE moments ADD COLUMN IF NOT EXISTS images TEXT    DEFAULT '[]'`
await sql`ALTER TABLE moments ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE`

/* ── Indexes ──
   Both list endpoints sort by these exact orderings; without an index Postgres
   does a full scan + sort on every request, which is the main reason a large
   archive gets slow. */
await sql`CREATE INDEX IF NOT EXISTS posts_list_idx   ON posts   (pinned DESC, date DESC)`
await sql`CREATE INDEX IF NOT EXISTS moments_list_idx ON moments (date DESC, time DESC)`
await sql`CREATE INDEX IF NOT EXISTS moments_hidden_idx ON moments (hidden) WHERE hidden IS TRUE`

console.log('✅ Database migrated — posts + moments + settings ready, indexes in place.')
process.exit(0)
