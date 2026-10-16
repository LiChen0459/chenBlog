import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'settings.json')

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function readAll() {
  await ensureDir()
  try {
    const parsed = JSON.parse(await readFile(FILE, 'utf-8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeAll(settings) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

/** Simple key → string store, backed by server/data/settings.json. */
export const fileSettingsRepo = {
  async get(key) {
    const all = await readAll()
    return typeof all[key] === 'string' ? all[key] : null
  },

  async set(key, value) {
    const all = await readAll()
    all[key] = String(value)
    await writeAll(all)
    return true
  },

  async delete(key) {
    const all = await readAll()
    if (!(key in all)) return false
    delete all[key]
    await writeAll(all)
    return true
  },
}
