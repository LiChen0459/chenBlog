import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseList, fmtDate, today, normaliseLimit, normaliseOffset } from '../utils.js'

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
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(moments) {
  await ensureDir()
  await writeFile(FILE, JSON.stringify(moments, null, 2), 'utf-8')
}

function parse(moment) {
  const images = parseList(moment.images)
  const list = images.length ? images : (moment.image ? [moment.image] : [])
  return {
    id: moment.id,
    date: fmtDate(moment.date),
    time: moment.time || '00:00',
    content: moment.content || '',
    images: list,
    image: list[0] || null,
    tags: parseList(moment.tags),
    hidden: !!moment.hidden,
  }
}

function sortMoments(a, b) {
  return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
}

export const fileMomentsRepo = {
  async getAll({ limit, offset = 0, includeHidden = false } = {}) {
    const lim = normaliseLimit(limit, null, 100)
    const off = normaliseOffset(offset)
    let moments = (await readAll()).map(parse).sort(sortMoments)
    if (!includeHidden) moments = moments.filter(m => !m.hidden)
    if (lim) return moments.slice(off, off + lim)
    return off ? moments.slice(off) : moments
  },

  /** How many moments are currently hidden (used to decide whether to show the unlock button). */
  async countHidden() {
    return (await readAll()).filter(m => m.hidden).length
  },

  /** Total moments, optionally including hidden ones — used for pagination. */
  async count({ includeHidden = false } = {}) {
    const all = await readAll()
    return includeHidden ? all.length : all.filter(m => !m.hidden).length
  },

  async getById(id) {
    const moment = (await readAll()).find(m => m.id === id)
    return moment ? parse(moment) : null
  },

  async create(data) {
    const moments = await readAll()
    const id = moments.length > 0 ? Math.max(...moments.map(m => Number(m.id) || 0)) + 1 : 1
    const images = parseList(data.images ?? data.image)
    const moment = {
      id,
      date: data.date || today(),
      time: data.time || '00:00',
      content: data.content || '',
      images,
      image: images[0] || null,
      tags: parseList(data.tags),
      hidden: !!data.hidden,
    }
    moments.push(moment)
    await writeAll(moments)
    return parse(moment)
  },

  async update(id, data) {
    const moments = await readAll()
    const idx = moments.findIndex(m => m.id === id)
    if (idx === -1) return null
    const current = moments[idx]
    const images = (data.images !== undefined || data.image !== undefined)
      ? parseList(data.images ?? data.image)
      : parse(current).images
    // Never let the request body rewrite the primary key.
    moments[idx] = {
      ...current,
      date: data.date ?? current.date,
      time: data.time ?? current.time,
      content: data.content ?? current.content,
      images,
      image: images[0] || null,
      tags: data.tags !== undefined ? parseList(data.tags) : parseList(current.tags),
      hidden: data.hidden !== undefined ? !!data.hidden : !!current.hidden,
    }
    await writeAll(moments)
    return parse(moments[idx])
  },

  async delete(id) {
    const moments = await readAll()
    const filtered = moments.filter(m => m.id !== id)
    if (filtered.length === moments.length) return null
    await writeAll(filtered)
    return { deleted: true }
  },

  /**
   * Bulk-set the `hidden` flag. Unknown ids are ignored rather than erroring —
   * a stale selection in the admin UI should not fail the whole batch.
   */
  async setHiddenMany(ids, hidden) {
    const set = new Set((ids || []).map(Number).filter(Number.isFinite))
    if (!set.size) return { updated: 0 }
    const moments = await readAll()
    let updated = 0
    const next = moments.map((m) => {
      if (!set.has(Number(m.id))) return m
      updated++
      return { ...m, hidden: !!hidden }
    })
    if (updated) await writeAll(next)
    return { updated }
  },

  /** Bulk delete. Returns how many rows were actually removed. */
  async deleteMany(ids) {
    const set = new Set((ids || []).map(Number).filter(Number.isFinite))
    if (!set.size) return { deleted: 0 }
    const moments = await readAll()
    const kept = moments.filter(m => !set.has(Number(m.id)))
    const deleted = moments.length - kept.length
    if (deleted) await writeAll(kept)
    return { deleted }
  },
}
