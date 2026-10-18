/**
 * Media library: listing stored images with their usage index, and deletion.
 * Runs against the local file repo — writes one real file into
 * public/uploads/ (cleaned up afterwards) and one post + moment that
 * reference it, then restores the JSON fixtures.
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import { createApp } from '../app.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const postsFile = new URL('../data/posts.json', import.meta.url)
const momentsFile = new URL('../data/moments.json', import.meta.url)
const uploadsDir = new URL('../../public/uploads/', import.meta.url)
const testFile = new URL('media-test-image.jpg', uploadsDir)

const postsBackup = await readFile(postsFile, 'utf-8')
const momentsBackup = await readFile(momentsFile, 'utf-8')

// A tiny valid-enough JPEG payload (only size/mime matter here).
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwc' +
    'JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
  'base64',
)

const app = createApp()
const AUTH = { Authorization: 'Bearer test-admin-token' }
const J = { 'Content-Type': 'application/json' }

let pass = 0, fail = 0
const check = (n, c, x = '') => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n} ${x}`))

async function req(path, opts = {}) {
  const res = await app.request(path, opts)
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

const TEST_URL = '/uploads/media-test-image.jpg'

let createdPostId = null
let createdMomentId = null

try {
  console.log('\n── media library ──')

  // ---- auth ----
  let r = await req('/api/media')
  check('list without auth → 401', r.status === 401, JSON.stringify(r.body))
  r = await req(`/api/media?url=${encodeURIComponent(TEST_URL)}`, { method: 'DELETE' })
  check('delete without auth → 401', r.status === 401)

  // ---- seed: one image + one post + one moment referencing it ----
  await writeFile(testFile, JPEG)

  r = await req('/api/posts', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({
      title: '媒体库测试文章', date: '2026-10-18', summary: '',
      category: '', content: `配图：![图](${TEST_URL})`,
    }),
  })
  createdPostId = r.body?.data?.id ?? null
  check('seed post created', r.status === 201 && createdPostId !== null, JSON.stringify(r.body))

  r = await req('/api/moments', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({ content: '测试动态配图', images: [TEST_URL] }),
  })
  createdMomentId = r.body?.data?.id ?? null
  check('seed moment created', r.status === 201 && createdMomentId !== null, JSON.stringify(r.body))

  // ---- list + usage index ----
  r = await req('/api/media', { headers: AUTH })
  check('list → 200', r.status === 200, JSON.stringify(r.body).slice(0, 120))
  const item = (r.body?.data ?? []).find((i) => i.url === TEST_URL)
  check('seeded image appears in the list', !!item, JSON.stringify((r.body?.data ?? []).map((i) => i.url)))
  check('size is reported', item?.size > 0, String(item?.size))
  const used = (item?.usedIn ?? []).map((u) => `${u.type}:${u.id}`)
  check('usage points at the post', used.includes(`post:${createdPostId}`), JSON.stringify(item?.usedIn))
  check('usage points at the moment', used.includes(`moment:${createdMomentId}`), JSON.stringify(item?.usedIn))
  check('usage entry carries a title', (item?.usedIn ?? []).every((u) => !!u.title))

  // ---- delete ----
  r = await req('/api/media', { method: 'DELETE', headers: AUTH })
  check('delete without url → 400', r.status === 400)

  r = await req(`/api/media?url=${encodeURIComponent('/uploads/../posts.json')}`, {
    method: 'DELETE', headers: AUTH,
  })
  check('path traversal rejected → 500', r.status === 500, JSON.stringify(r.body))

  r = await req(`/api/media?url=${encodeURIComponent(TEST_URL)}`, { method: 'DELETE', headers: AUTH })
  check('delete → 200', r.status === 200, JSON.stringify(r.body))

  let gone = false
  try { await readFile(testFile) } catch { gone = true }
  check('file is actually gone', gone)

  r = await req('/api/media', { headers: AUTH })
  check('list no longer contains it', !(r.body?.data ?? []).some((i) => i.url === TEST_URL))

  // ---- cleanup of the seeded rows ----
  if (createdPostId !== null) {
    await req(`/api/posts/${createdPostId}`, { method: 'DELETE', headers: AUTH })
  }
  if (createdMomentId !== null) {
    await req(`/api/moments/${createdMomentId}`, { method: 'DELETE', headers: AUTH })
  }
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await rm(testFile, { force: true })
  await writeFile(postsFile, postsBackup, 'utf-8')
  await writeFile(momentsFile, momentsBackup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
