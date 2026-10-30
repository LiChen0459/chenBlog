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
const metaFile = new URL('../data/media-meta.json', import.meta.url)
const uploadsDir = new URL('../../public/uploads/', import.meta.url)
const testFile = new URL('media-test-image.jpg', uploadsDir)
const pageTestPrefix = `media-page-${process.pid}-`
const pageTestFiles = Array.from({ length: 101 }, (_, i) => new URL(`${pageTestPrefix}${i}.jpg`, uploadsDir))

const postsBackup = await readFile(postsFile, 'utf-8')
const momentsBackup = await readFile(momentsFile, 'utf-8')
let metaBackup = null
try { metaBackup = await readFile(metaFile, 'utf-8') } catch {}

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
let createdHiddenMomentId = null

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

  // a SECOND moment, hidden — its usage must still be detected
  r = await req('/api/moments', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({ content: '隐藏动态配图', images: [TEST_URL], hidden: true }),
  })
  createdHiddenMomentId = r.body?.data?.id ?? null
  check('seed hidden moment created', r.status === 201 && createdHiddenMomentId !== null, JSON.stringify(r.body))

  // A referenced image beyond the first repository page must still be marked used.
  const seededPosts = JSON.parse(await readFile(postsFile, 'utf-8'))
  const nextId = Math.max(0, ...seededPosts.map((p) => Number(p.id) || 0)) + 1
  for (let i = 0; i < 205; i++) {
    seededPosts.push({
      id: nextId + i, title: `分页测试文章 ${i}`, date: '2026-10-18', summary: '',
      category: '', tags: '[]', content: i === 204 ? `![图](${TEST_URL})` : '分页测试',
    })
  }
  await writeFile(postsFile, JSON.stringify(seededPosts, null, 2), 'utf-8')

  // ---- list + usage index ----
  r = await req('/api/media', { headers: AUTH })
  check('list → 200', r.status === 200, JSON.stringify(r.body).slice(0, 120))
  const item = (r.body?.data ?? []).find((i) => i.url === TEST_URL)
  check('seeded image appears in the list', !!item, JSON.stringify((r.body?.data ?? []).map((i) => i.url)))
  check('size is reported', item?.size > 0, String(item?.size))
  const used = (item?.usedIn ?? []).map((u) => `${u.type}:${u.id}`)
  check('usage points at the post', used.includes(`post:${createdPostId}`), JSON.stringify(item?.usedIn))
  check('usage points at the (visible) moment', used.includes(`moment:${createdMomentId}`), JSON.stringify(item?.usedIn))
  check('usage points at the hidden moment', used.includes(`moment:${createdHiddenMomentId}`), JSON.stringify(item?.usedIn))
  check('usage includes references beyond the first 200 posts', used.includes(`post:${nextId + 204}`), JSON.stringify(item?.usedIn))
  check('usage entry carries a title', (item?.usedIn ?? []).every((u) => !!u.title))
  check('response carries store total (count)', typeof r.body?.total === 'number', JSON.stringify(r.body?.total))
  check('response carries store totalSize', typeof r.body?.totalSize === 'number', JSON.stringify(r.body?.totalSize))

  // ---- meta: tags / group ----
  check('meta defaults present', item?.meta?.tags !== undefined && item?.meta?.group !== undefined, JSON.stringify(item?.meta))

  r = await req('/api/media/meta', {
    method: 'PUT', headers: { ...AUTH, ...J },
    body: JSON.stringify({ url: TEST_URL, tags: ['测试', '封面'], group: '测试分组' }),
  })
  check('put meta → 200', r.status === 200, JSON.stringify(r.body))
  check('meta persisted tags', r.body?.data?.tags?.includes('测试'), JSON.stringify(r.body?.data))
  check('meta persisted group', r.body?.data?.group === '测试分组', JSON.stringify(r.body?.data))

  r = await req('/api/media', { headers: AUTH })
  const item2 = (r.body?.data ?? []).find((i) => i.url === TEST_URL)
  check('list reflects saved meta', item2?.meta?.group === '测试分组', JSON.stringify(item2?.meta))

  // ---- delete ----
  r = await req('/api/media', { method: 'DELETE', headers: AUTH })
  check('delete without url → 400', r.status === 400)

  r = await req(`/api/media?url=${encodeURIComponent('/uploads/../posts.json')}`, {
    method: 'DELETE', headers: AUTH,
  })
  check('path traversal rejected → 400', r.status === 400, JSON.stringify(r.body))

  r = await req(`/api/media?url=${encodeURIComponent(TEST_URL)}`, { method: 'DELETE', headers: AUTH })
  check('delete → 200', r.status === 200, JSON.stringify(r.body))

  let gone = false
  try { await readFile(testFile) } catch { gone = true }
  check('file is actually gone', gone)

  r = await req('/api/media', { headers: AUTH })
  check('list no longer contains it', !(r.body?.data ?? []).some((i) => i.url === TEST_URL))

  // Local uploads must expose every image through cursor pagination too.
  for (const file of pageTestFiles) await writeFile(file, JPEG)
  const seen = new Set()
  let cursor = ''
  do {
    const query = new URLSearchParams({ limit: '40', ...(cursor ? { cursor } : {}) })
    r = await req(`/api/media?${query}`, { headers: AUTH })
    check(`local media page ${cursor || 'first'} → 200`, r.status === 200)
    for (const image of r.body?.data || []) seen.add(image.pathname)
    cursor = r.body?.hasMore ? r.body?.cursor : ''
    if (r.body?.hasMore && !cursor) throw new Error('media pagination did not return a cursor')
  } while (cursor)
  check('local media pagination includes images beyond the first page', pageTestFiles.every((f) => {
    const name = f.pathname.split('/').pop()
    return [...seen].some((path) => path.endsWith(name))
  }))

  // ---- cleanup of the seeded rows ----
  if (createdPostId !== null) {
    await req(`/api/posts/${createdPostId}`, { method: 'DELETE', headers: AUTH })
  }
  if (createdMomentId !== null) {
    await req(`/api/moments/${createdMomentId}`, { method: 'DELETE', headers: AUTH })
  }
  if (createdHiddenMomentId !== null) {
    await req(`/api/moments/${createdHiddenMomentId}`, { method: 'DELETE', headers: AUTH })
  }
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await rm(testFile, { force: true })
  await Promise.all(pageTestFiles.map((f) => rm(f, { force: true })))
  await writeFile(postsFile, postsBackup, 'utf-8')
  await writeFile(momentsFile, momentsBackup, 'utf-8')
  if (metaBackup !== null) await writeFile(metaFile, metaBackup, 'utf-8')
  else try { await rm(metaFile, { force: true }) } catch {}
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
