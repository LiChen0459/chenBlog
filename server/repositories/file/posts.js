import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const FILE = join(DATA_DIR, 'posts.json')

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

async function writeAll(posts) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(posts, null, 2), 'utf-8')
}

export const filePostsRepo = {
  async getAll({ limit } = {}) {
    const posts = await readAll()
    const sorted = posts.sort((a, b) => new Date(b.date) - new Date(a.date))
    return limit ? sorted.slice(0, limit) : sorted
  },

  async getById(id) {
    const posts = await readAll()
    return posts.find(p => p.id === id) || null
  },

  async create(data) {
    const posts = await readAll()
    const id = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1
    const post = { id, ...data }
    posts.push(post)
    await writeAll(posts)
    return post
  },

  async update(id, data) {
    const posts = await readAll()
    const idx = posts.findIndex(p => p.id === id)
    if (idx === -1) return null
    posts[idx] = { ...posts[idx], ...data }
    await writeAll(posts)
    return posts[idx]
  },

  async delete(id) {
    const posts = await readAll()
    const filtered = posts.filter(p => p.id !== id)
    if (filtered.length === posts.length) return null
    await writeAll(filtered)
    return { deleted: true }
  },
}
