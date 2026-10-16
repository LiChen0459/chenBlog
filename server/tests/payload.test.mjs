/**
 * Measures the posts-list payload before/after the lean projection, and checks
 * pagination correctness. Uses a synthetic archive so the numbers are realistic.
 * Restores server/data/posts.json afterwards.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createApp } from '../app.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const FILE = new URL('../data/posts.json', import.meta.url)
const backup = await readFile(FILE, 'utf-8')

const POST_COUNT = 60
// A realistic medium-length markdown article (~18 KB).
const BODY = ('## 小标题\n\n这是一段正文内容，用来模拟真实文章的体积。'.repeat(6) + '\n\n```js\nconsole.log("hi")\n```\n\n').repeat(45)
const BODY_BYTES = Buffer.byteLength(BODY, 'utf-8')

const synthetic = Array.from({ length: POST_COUNT }, (_, i) => ({
  id: i + 1,
  title: `第 ${i + 1} 篇文章的标题`,
  date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  summary: `这是第 ${i + 1} 篇文章的摘要，大约几十个字，用于列表页展示。`,
  content: BODY,
  tags: ['技术', '随笔'].slice(0, (i % 2) + 1),
  pinned: i === 0,
}))

await writeFile(FILE, JSON.stringify(synthetic, null, 2), 'utf-8')

const app = createApp()
const AUTH = { Authorization: 'Bearer test-admin-token' }

let pass = 0, fail = 0
const check = (n, c, x = '') => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n} ${x}`))
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

async function timed(path, opts) {
  const t0 = performance.now()
  const res = await app.request(path, opts)
  const text = await res.text()
  return { ms: performance.now() - t0, bytes: Buffer.byteLength(text, 'utf-8'), body: JSON.parse(text) }
}

try {
  console.log(`\n── posts payload (${POST_COUNT} posts × ${kb(BODY_BYTES)} body) ──`)
  console.log(`  archive size on disk: ${kb(Buffer.byteLength(JSON.stringify(synthetic)))}`)

  // What the OLD code shipped: every post WITH its full body. Measured straight
  // from the repo (the route now always strips content, so it can't show this).
  const { getPostsRepo } = await import('../repositories/index.js')
  const repo = await getPostsRepo()
  const oldRows = await repo.getAll({ withContent: true })
  const oldBytes = Buffer.byteLength(JSON.stringify(oldRows), 'utf-8')
  const oldOnePage = Buffer.byteLength(JSON.stringify(oldRows.slice(0, 9)), 'utf-8')

  const leanAll = await timed('/api/posts')
  const leanBytes = Buffer.byteLength(JSON.stringify(leanAll.body.data), 'utf-8')

  const page = await timed('/api/posts?limit=9')
  const pageBytes = Buffer.byteLength(JSON.stringify(page.body.data), 'utf-8')

  console.log(`\n  OLD  list (all ${POST_COUNT}, with body)   → ${kb(oldBytes)}`)
  console.log(`  NEW  list (all ${POST_COUNT}, lean)        → ${kb(leanBytes)}`)
  console.log(`  NEW  list?limit=9                     → ${kb(pageBytes)}`)
  console.log(`\n  first screen : ${kb(oldOnePage)} → ${kb(pageBytes)}  (${(oldOnePage / pageBytes).toFixed(1)}× smaller)`)
  console.log(`  full archive : ${kb(oldBytes)} → ${kb(leanBytes)}  (${(oldBytes / leanBytes).toFixed(1)}× smaller)`)

  check('lean list omits content', leanAll.body.data.every(p => !('content' in p)), 'content leaked')
  check('lean list keeps summary/tags', leanAll.body.data.every(p => p.summary && Array.isArray(p.tags)))
  check('page returns exactly 9', page.body.data.length === 9, String(page.body.data.length))
  check('page reports total', page.body.total === POST_COUNT, String(page.body.total))
  check('page reports hasMore', page.body.hasMore === true)
  check('first screen ≥5× smaller than the old one', oldOnePage / pageBytes >= 5,
    `${(oldOnePage / pageBytes).toFixed(1)}×`)
  check('full-archive list ≥20× smaller', oldBytes / leanBytes >= 20,
    `${(oldBytes / leanBytes).toFixed(1)}×`)

  // ---- pagination correctness ----
  const p1 = await timed('/api/posts?limit=9&offset=0')
  const p2 = await timed('/api/posts?limit=9&offset=9')
  const ids1 = p1.body.data.map(p => p.id)
  const ids2 = p2.body.data.map(p => p.id)
  check('offset pages do not overlap', !ids1.some(id => ids2.includes(id)), `${ids1} / ${ids2}`)
  check('pinned post sorts first', p1.body.data[0].pinned === true, JSON.stringify(p1.body.data[0]))

  const last = await timed(`/api/posts?limit=9&offset=${POST_COUNT - 3}`)
  check('final page returns the remainder', last.body.data.length === 3, String(last.body.data.length))
  check('final page hasMore=false', last.body.hasMore === false)

  const past = await timed(`/api/posts?limit=9&offset=${POST_COUNT + 50}`)
  check('offset past the end → empty', past.body.data.length === 0)

  // ---- page shorthand still works ----
  const byPage = await timed('/api/posts?page=2&limit=9')
  check('?page=2 equals offset=9', JSON.stringify(byPage.body.data.map(p => p.id)) === JSON.stringify(ids2),
    JSON.stringify(byPage.body.data.map(p => p.id)))

  // ---- detail endpoint still returns the body ----
  const detail = await timed('/api/posts/7')
  check('GET /api/posts/:id returns content', typeof detail.body.data.content === 'string' && detail.body.data.content.length > 1000)
  check('detail content matches source', detail.body.data.content === BODY)

  // ---- limits are clamped ----
  const huge = await timed('/api/posts?limit=99999')
  check('limit is clamped to 200', huge.body.limit === 200, String(huge.body.limit))

  const negative = await timed('/api/posts?limit=-5')
  check('negative limit ignored → all rows', negative.body.data.length === POST_COUNT, String(negative.body.data.length))

  // ---- admin/backup still gets bodies ----
  const backupRes = await timed('/api/backup', { headers: AUTH })
  check('backup keeps full content', backupRes.body.data.posts.every(p => typeof p.content === 'string' && p.content.length > 1000))
  check('backup is complete', backupRes.body.data.posts.length === POST_COUNT)

  console.log('\n  file-repo timings (in-memory JSON, not representative of Postgres):')
  console.log(`    lean list : ${leanAll.ms.toFixed(1)} ms`)
  console.log(`    one page  : ${page.ms.toFixed(1)} ms`)
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await writeFile(FILE, backup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
