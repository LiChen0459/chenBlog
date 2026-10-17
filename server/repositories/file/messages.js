import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fmtDate, MAX_NICKNAME_LEN, MAX_MESSAGE_LEN } from '../utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'messages.json')

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function readAll() {
  await ensureDir()
  try {
    const raw = await readFile(FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(messages) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(messages, null, 2), 'utf-8')
}

/** Split the ISO timestamp into the date + time pair the frontend renders. */
function parse(message) {
  const iso = message.created_at || ''
  const d = new Date(iso)
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return {
    id: message.id,
    nickname: message.nickname || '匿名',
    content: message.content || '',
    hidden: !!message.hidden,
    created_at: iso,
    date: fmtDate(iso),
    time,
  }
}

export const fileMessagesRepo = {
  /** Newest first. Hidden messages are only visible to the admin (see routes). */
  async getAll({ limit, offset = 0, includeHidden = false } = {}) {
    let messages = (await readAll()).filter((m) => includeHidden || !m.hidden)
    messages.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    const off = Number(offset) > 0 ? Math.floor(Number(offset)) : 0
    if (limit) return messages.slice(off, off + Number(limit)).map(parse)
    return off ? messages.slice(off).map(parse) : messages.map(parse)
  },

  async count({ includeHidden = false } = {}) {
    return (await readAll()).filter((m) => includeHidden || !m.hidden).length
  },

  async create(data) {
    const messages = await readAll()
    const id = messages.length > 0 ? Math.max(...messages.map((m) => Number(m.id) || 0)) + 1 : 1
    const message = {
      id,
      nickname: String(data.nickname ?? '').slice(0, MAX_NICKNAME_LEN),
      content: String(data.content ?? '').slice(0, MAX_MESSAGE_LEN),
      hidden: false,
      created_at: new Date().toISOString(),
    }
    messages.push(message)
    await writeAll(messages)
    return parse(message)
  },

  async setHidden(id, hidden) {
    const messages = await readAll()
    const idx = messages.findIndex((m) => m.id === id)
    if (idx === -1) return null
    messages[idx].hidden = !!hidden
    await writeAll(messages)
    return { hidden: !!hidden }
  },

  async delete(id) {
    const messages = await readAll()
    const kept = messages.filter((m) => m.id !== id)
    if (kept.length === messages.length) return null
    await writeAll(kept)
    return { deleted: true }
  },
}
