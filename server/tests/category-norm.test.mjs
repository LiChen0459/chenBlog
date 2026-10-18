/**
 * Category hygiene: values typed with stray slashes ("信息学奥赛/") used to
 * leak into chip labels, links and the exact-match filter. Storage now
 * normalises on write and the taxonomy builder cleans on read.
 *
 * Runs against the local JSON repo; restores posts.json afterwards.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createApp } from '../app.js'
import { normCategory } from '../repositories/utils.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const postsFile = new URL('../data/posts.json', import.meta.url)
const postsBackup = await readFile(postsFile, 'utf-8')

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

try {
  console.log('\n── category normalisation ──')

  // ---- unit: normCategory ----
  check('trailing slash trimmed', normCategory('信息学奥赛/') === '信息学奥赛')
  check('leading slash trimmed', normCategory('/技术') === '技术')
  check('double slashes collapsed', normCategory('技术//前端/') === '技术/前端')
  check('segments trimmed', normCategory(' 技术 / 前端 ') === '技术/前端')
  check('slashes only → empty', normCategory('///') === '')
  check('empty-ish inputs → empty', normCategory(undefined) === '' && normCategory(null) === '' && normCategory('   ') === '')
  check('clean path unchanged', normCategory('技术/前端/Vue') === '技术/前端/Vue')

  // ---- unit: buildTaxonomy never registers ghost nodes ----
  const tax = (await import('../repositories/utils.js')).buildTaxonomy([
    { category: '信息学奥赛/', tags: [] },
    { category: '信息学奥赛', tags: [] },
    { category: '', tags: [] },
  ])
  check('dirty category merges into one clean node',
    tax.categories.length === 1 && tax.categories[0].path === '信息学奥赛' && tax.categories[0].count === 2,
    JSON.stringify(tax.categories))
  check('uncategorised post adds no node', !tax.categories.some((c) => c.path === ''))

  // ---- write path: repo normalises dirty input ----
  let r = await req('/api/posts', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({ title: '脏分类测试', date: '2026-10-18', summary: '', category: '信息学奥赛/', content: 'x' }),
  })
  const newId = r.body?.data?.id
  check('create → 201', r.status === 201, JSON.stringify(r.body))
  check('created category is clean', r.body?.data?.category === '信息学奥赛', JSON.stringify(r.body?.data?.category))

  r = await req(`/api/posts/${newId}`, {
    method: 'PUT', headers: { ...AUTH, ...J },
    body: JSON.stringify({ title: '脏分类测试', date: '2026-10-18', summary: '', category: ' 技术 // 前端 /', content: 'x' }),
  })
  check('update → 200', r.status === 200)
  check('updated category is clean', r.body?.data?.category === '技术/前端', JSON.stringify(r.body?.data?.category))

  // ---- read path: the exact-match filter sees the clean value ----
  r = await req('/api/posts?category=' + encodeURIComponent('技术/前端'))
  const ids = (r.body?.data ?? []).map((p) => p.id)
  check('filter finds the written post', ids.includes(newId), JSON.stringify(ids))

  r = await req('/api/posts?category=' + encodeURIComponent('技术/前端/'))
  check('dirty filter param finds nothing new', !((r.body?.data ?? []).map((p) => p.id).includes(newId)))

  // ---- cleanup ----
  r = await req(`/api/posts/${newId}`, { method: 'DELETE', headers: AUTH })
  check('test post deleted', r.status === 200, JSON.stringify(r.body))
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await writeFile(postsFile, postsBackup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
