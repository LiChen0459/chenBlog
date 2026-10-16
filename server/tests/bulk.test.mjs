/**
 * Batch operations (`POST /api/moments/bulk`, `POST /api/posts/bulk`).
 *
 * Runs against the local JSON store and restores the fixture afterwards. Every
 * batch assertion works on records this suite creates itself, so the checks do
 * not depend on whatever happens to be in server/data/*.json.
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import { createApp } from '../app.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const postsFile = new URL('../data/posts.json', import.meta.url)
const momentsFile = new URL('../data/moments.json', import.meta.url)
const settingsFile = new URL('../data/settings.json', import.meta.url)

const postsBackup = await readFile(postsFile, 'utf-8')
const momentsBackup = await readFile(momentsFile, 'utf-8')
let settingsBackup = null
try { settingsBackup = await readFile(settingsFile, 'utf-8') } catch {}

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

const bulkMoments = (ids, action) =>
  req('/api/moments/bulk', { method: 'POST', headers: { ...AUTH, ...J }, body: JSON.stringify({ ids, action }) })

const bulkPosts = (ids, action) =>
  req('/api/posts/bulk', { method: 'POST', headers: { ...AUTH, ...J }, body: JSON.stringify({ ids, action }) })

const makeMoment = async (content) => {
  const r = await req('/api/moments', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({ content, date: '2026-01-01', time: '00:00' }),
  })
  return r.body.data.id
}

const makePost = async (title) => {
  const r = await req('/api/posts', {
    method: 'POST', headers: { ...AUTH, ...J },
    body: JSON.stringify({ title, summary: 'bulk test', content: 'body', date: '2026-01-01' }),
  })
  return r.body.data.id
}

/** Admin view of every moment, including hidden ones. */
const allMoments = async () => (await req('/api/moments', { headers: AUTH })).body.data
/** Admin view of every post (lean projection). */
const allPosts = async () => (await req('/api/posts?limit=200', { headers: AUTH })).body.data

try {
  console.log('\n── /api/moments/bulk ──')

  // ---- auth + validation ----
  let r = await req('/api/moments/bulk', { method: 'POST', headers: J, body: JSON.stringify({ ids: [1], action: 'hide' }) })
  check('bulk moments without auth → 401', r.status === 401, JSON.stringify(r.body))

  r = await bulkMoments([], 'hide')
  check('empty ids → 400', r.status === 400, JSON.stringify(r.body))

  r = await bulkMoments(null, 'hide')
  check('null ids → 400', r.status === 400, JSON.stringify(r.body))

  r = await bulkMoments([0, -3, 'abc', null], 'hide')
  check('all-invalid ids → 400', r.status === 400, JSON.stringify(r.body))

  r = await bulkMoments([1], 'explode')
  check('unknown action → 400', r.status === 400, JSON.stringify(r.body))

  // ---- fixtures ----
  const m1 = await makeMoment('bulk A')
  const m2 = await makeMoment('bulk B')
  const m3 = await makeMoment('bulk C')

  // ---- hide / show round-trip ----
  r = await bulkMoments([m1, m2], 'hide')
  check('hide 2 → 200', r.status === 200 && r.body.data.updated === 2, JSON.stringify(r.body))

  let list = await allMoments()
  const hiddenIds = list.filter(m => m.hidden).map(m => m.id)
  check('both are hidden in the admin list', hiddenIds.includes(m1) && hiddenIds.includes(m2),
    JSON.stringify(hiddenIds))
  check('the third one is untouched', !hiddenIds.includes(m3))

  r = await bulkMoments([m1, m2], 'show')
  check('show 2 → updated 2', r.status === 200 && r.body.data.updated === 2, JSON.stringify(r.body))
  list = await allMoments()
  check('both are public again', list.filter(m => [m1, m2].includes(m.id)).every(m => !m.hidden))

  // ---- unknown ids are ignored, not fatal ----
  r = await bulkMoments([m1, 999999], 'hide')
  check('unknown id is ignored', r.status === 200 && r.body.data.updated === 1, JSON.stringify(r.body))
  await bulkMoments([m1], 'show')

  // ---- ids are de-duplicated and coerced ----
  r = await bulkMoments([m1, m1, String(m1)], 'hide')
  check('duplicate + string ids collapse to one', r.body.data.updated === 1, JSON.stringify(r.body))
  await bulkMoments([m1], 'show')

  // ---- hidden moments stay hidden from the public ----
  await bulkMoments([m1], 'hide')
  const publicList = await req('/api/moments')
  check('public list never leaks a bulk-hidden moment',
    !publicList.body.data.some(m => m.id === m1), JSON.stringify(publicList.body.data.map(m => m.id)))
  const publicDetail = await req(`/api/moments/${m1}`)
  check('public /:id of a bulk-hidden moment → 404', publicDetail.status === 404)

  // ---- delete ----
  r = await bulkMoments([m1, m2, m3], 'delete')
  check('delete 3 → deleted 3', r.status === 200 && r.body.data.deleted === 3, JSON.stringify(r.body))
  list = await allMoments()
  check('all three are gone', ![m1, m2, m3].some(id => list.some(m => m.id === id)))

  r = await bulkMoments([999999], 'delete')
  check('deleting only unknown ids → deleted 0', r.status === 200 && r.body.data.deleted === 0,
    JSON.stringify(r.body))

  // ---- the /bulk route is not swallowed by /:id ----
  r = await req('/api/moments/bulk', { method: 'POST', headers: { ...AUTH, ...J }, body: JSON.stringify({ ids: [1], action: 'hide' }) })
  check('POST /api/moments/bulk is routed to bulk, not /:id', r.status === 200, JSON.stringify(r.body))
  await bulkMoments([1], 'show')

  console.log('\n── /api/posts/bulk ──')
  const p1 = await makePost('bulk post A')
  const p2 = await makePost('bulk post B')

  r = await req('/api/posts/bulk', { method: 'POST', headers: J, body: JSON.stringify({ ids: [p1], action: 'delete' }) })
  check('bulk posts without auth → 401', r.status === 401)

  r = await bulkPosts([p1, p2], 'pin')
  check('pin 2 → updated 2', r.status === 200 && r.body.data.updated === 2, JSON.stringify(r.body))
  let posts = await allPosts()
  check('both are pinned', posts.filter(p => [p1, p2].includes(p.id)).every(p => p.pinned))

  r = await bulkPosts([p1, p2], 'unpin')
  check('unpin 2 → updated 2', r.status === 200 && r.body.data.updated === 2)
  posts = await allPosts()
  check('both are unpinned', posts.filter(p => [p1, p2].includes(p.id)).every(p => !p.pinned))

  r = await bulkPosts([p1], 'explode')
  check('unknown post action → 400', r.status === 400)

  r = await bulkPosts([p1, p2], 'delete')
  check('delete 2 posts → deleted 2', r.status === 200 && r.body.data.deleted === 2, JSON.stringify(r.body))
  posts = await allPosts()
  check('both posts are gone', ![p1, p2].some(id => posts.some(p => p.id === id)))

  console.log('\n── Vercel entry (api/index.js) ──')
  const { default: handler } = await import('../../api/index.js')
  const { EventEmitter } = await import('node:events')

  function mockReq(method, url, { headers = {}, body = null } = {}) {
    const rq = new EventEmitter()
    rq.method = method
    rq.url = url
    rq.headers = { host: 'localhost', ...headers }
    setTimeout(() => {
      if (body != null) rq.emit('data', Buffer.from(JSON.stringify(body)))
      rq.emit('end')
    }, 0)
    return rq
  }
  function mockRes() {
    const rs = new EventEmitter()
    rs.statusCode = 200
    rs.headers = {}
    rs.setHeader = (k, v) => { rs.headers[k.toLowerCase()] = v }
    rs._body = ''
    rs.end = (chunk) => { if (chunk) rs._body += chunk; rs.emit('_done') }
    return rs
  }
  async function call(method, url, opts) {
    const rq = mockReq(method, url, opts)
    const rs = mockRes()
    const done = new Promise((resolve) => rs.on('_done', resolve))
    await handler(rq, rs)
    await done
    let body = null
    try { body = JSON.parse(rs._body) } catch {}
    return { status: rs.statusCode, body }
  }

  const entryAuth = { authorization: 'Bearer test-admin-token' }
  const vm1 = await makeMoment('vercel bulk A')
  const vm2 = await makeMoment('vercel bulk B')

  r = await call('POST', '/api/moments/bulk', { headers: entryAuth, body: { ids: [vm1, vm2], action: 'hide' } })
  check('entry: hide 2 → updated 2', r.status === 200 && r.body.data.updated === 2, JSON.stringify(r.body))

  r = await call('POST', '/api/moments/bulk', { headers: {}, body: { ids: [vm1], action: 'hide' } })
  check('entry: no auth → 401', r.status === 401)

  r = await call('POST', '/api/moments/bulk', { headers: entryAuth, body: { ids: [], action: 'hide' } })
  check('entry: empty ids → 400', r.status === 400)

  r = await call('POST', '/api/moments/bulk', { headers: entryAuth, body: { ids: [vm1, vm2], action: 'delete' } })
  check('entry: delete 2 → deleted 2', r.status === 200 && r.body.data.deleted === 2, JSON.stringify(r.body))

  const vp1 = await makePost('vercel bulk post')
  r = await call('POST', '/api/posts/bulk', { headers: entryAuth, body: { ids: [vp1], action: 'pin' } })
  check('entry: pin 1 → updated 1', r.status === 200 && r.body.data.updated === 1, JSON.stringify(r.body))
  r = await call('POST', '/api/posts/bulk', { headers: entryAuth, body: { ids: [vp1], action: 'delete' } })
  check('entry: delete 1 post → deleted 1', r.status === 200 && r.body.data.deleted === 1, JSON.stringify(r.body))
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await writeFile(postsFile, postsBackup, 'utf-8')
  await writeFile(momentsFile, momentsBackup, 'utf-8')
  if (settingsBackup === null) await rm(settingsFile, { force: true })
  else await writeFile(settingsFile, settingsBackup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
