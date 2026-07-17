import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'moments.json')

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function readAll() {
  await ensureDir()
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeAll(moments) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(moments, null, 2), 'utf-8')
}

export const fileMomentsRepo = {
  async getAll({ limit } = {}) {
    const moments = await readAll()
    const sorted = moments.sort((a, b) => {
      const da = `${a.date} ${a.time}`
      const db = `${b.date} ${b.time}`
      return db.localeCompare(da)
    })
    return limit ? sorted.slice(0, limit) : sorted
  },

  async getById(id) {
    const moments = await readAll()
    return moments.find(m => m.id === id) || null
  },

  async create(data) {
    const moments = await readAll()
    const id = moments.length > 0 ? Math.max(...moments.map(m => m.id)) + 1 : 1
    const moment = { id, ...data }
    moments.push(moment)
    await writeAll(moments)
    return moment
  },

  async update(id, data) {
    const moments = await readAll()
    const idx = moments.findIndex(m => m.id === id)
    if (idx === -1) return null
    moments[idx] = { ...moments[idx], ...data }
    await writeAll(moments)
    return moments[idx]
  },

  async delete(id) {
    const moments = await readAll()
    const filtered = moments.filter(m => m.id !== id)
    if (filtered.length === moments.length) return null
    await writeAll(filtered)
    return { deleted: true }
  },
}
