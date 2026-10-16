/**
 * Verifies the Vercel serverless entry (api/index.js) — the code path production
 * actually runs. Covers pagination, hidden moments, the scoped unlock token and
 * the settings endpoint. Uses a minimal IncomingMessage/ServerResponse mock.
 */
import { EventEmitter } from 'node:events'
import { readFile, writeFile, rm } from 'node:fs/promises'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const postsFile = new URL('../data/posts.json', import.meta.url)
const momentsFile = new URL('../data/moments.json', import.meta.url)
const settingsFile = new URL('../data/settings.json', import.meta.url)

const postsBackup = await readFile(postsFile, 'utf-8')
const momentsBackup = await readFile(momentsFile, 'utf-8')
let settingsBackup = null
try { settingsBackup = await readFile(settingsFile, 'utf-8') } catch {}

const { default: handler } = await import('../../api/index.js')

const AUTH = { authorization: 'Bearer test-admin-token' }

function mockReq(method, url, { headers = {}, body = null } = {}) {
  const req = new EventEmitter()
  req.method = method
  req.url = url
  req.headers = { host: 'localhost', ...headers }
  setTimeout(() => {
    if (body != null) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  }, 0)
  return req
}

function mockRes() {
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = {}
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v }
  res._body = ''
  res.end = (chunk) => { if (chunk) res._body += chunk; res.emit('_done') }
  return res
}

async function call(method, url, opts) {
  const req = mockReq(method, url, opts)
  const res = mockRes()
  const done = new Promise((r) => res.on('_done', r))
  await handler(req, res)
  await done
  let body = null
  try { body = JSON.parse(res._body) } catch {}
  return { status: res.statusCode, body, bytes: Buffer.byteLength(res._body, 'utf-8') }
}

let pass = 0, fail = 0
const check = (n, c, x = '') => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n} ${x}`))

// This suite runs against the live local fixture rather than seeding its own,
// so every hidden-moment assertion is expressed as a delta from the starting
// state — never an absolute count. What we actually care about: an anonymous
// caller must never see a hidden row, an authorised one must.
const hiddenIn = (body) => (body?.data ?? []).filter((m) => m.hidden).length

try {
  console.log('\n── api/index.js (Vercel entry) ──')

  // ---- pagination ----
  let r = await call('GET', '/api/posts?limit=2')
  check('posts?limit=2 → 2 rows', r.status === 200 && r.body.data.length === 2, JSON.stringify(r.body).slice(0, 120))
  check('posts list omits content', r.body.data.every(p => !('content' in p)))
  check('posts list reports total', typeof r.body.total === 'number' && r.body.total > 0, String(r.body.total))
  check('posts list reports hasMore', r.body.hasMore === true)

  const page1 = await call('GET', '/api/posts?limit=2&offset=0')
  const page2 = await call('GET', '/api/posts?limit=2&offset=2')
  check('offset pages do not overlap',
    !page1.body.data.some(p => page2.body.data.some(q => q.id === p.id)),
    JSON.stringify([page1.body.data.map(p => p.id), page2.body.data.map(p => p.id)]))

  const detail = await call('GET', `/api/posts/${page1.body.data[0].id}`)
  check('post detail includes content', typeof detail.body.data.content === 'string')

  // ---- hidden moments + scoped unlock token ----
  r = await call('GET', '/api/moments/hidden-count')
  const hiddenBefore = r.body.data.count
  check('hidden-count is readable', typeof hiddenBefore === 'number', JSON.stringify(r.body))

  r = await call('PUT', '/api/moments/1', { headers: AUTH, body: { hidden: true } })
  check('hide a moment → 200', r.status === 200 && r.body.data.hidden === true, JSON.stringify(r.body))

  r = await call('GET', '/api/moments')
  check('anonymous list leaks no hidden row', hiddenIn(r.body) === 0, JSON.stringify(r.body))
  check('anonymous list omits the hidden moment', !r.body.data.some(m => m.id === 1), JSON.stringify(r.body))
  r = await call('GET', '/api/moments/hidden-count')
  check('hidden-count increments by exactly 1', r.body.data.count === hiddenBefore + 1,
    `${hiddenBefore} → ${r.body.data.count}`)
  r = await call('GET', '/api/moments/1')
  check('anonymous /:id → 404', r.status === 404)

  // ---- settings endpoint ----
  r = await call('GET', '/api/settings/moments-password')
  check('settings without auth → 401', r.status === 401)
  r = await call('GET', '/api/settings/moments-password', { headers: AUTH })
  check('settings with auth → custom:false', r.status === 200 && r.body.data.custom === false, JSON.stringify(r.body))

  // ---- unlock with ADMIN_TOKEN ----
  r = await call('POST', '/api/moments/unlock', { body: { password: 'test-admin-token' } })
  check('unlock with ADMIN_TOKEN → 200', r.status === 200, JSON.stringify(r.body))
  const token = r.body.data?.token
  check('returns a scoped token', typeof token === 'string' && token.includes('.'))

  r = await call('GET', '/api/moments', { headers: { 'x-moments-unlock': token } })
  check('scoped token reveals hidden', hiddenIn(r.body) >= 1 && r.body.data.some(m => m.id === 1 && m.hidden),
    JSON.stringify(r.body))
  r = await call('GET', '/api/moments/1', { headers: { 'x-moments-unlock': token } })
  check('scoped token reveals hidden /:id', r.status === 200)

  r = await call('GET', '/api/moments', { headers: { 'x-moments-unlock': 'nope' } })
  check('bogus unlock token leaks no hidden row', hiddenIn(r.body) === 0, JSON.stringify(r.body))

  // ---- scoped token must not escalate ----
  r = await call('GET', '/api/settings/moments-password', { headers: { 'x-moments-unlock': token } })
  check('scoped token cannot read settings → 401', r.status === 401)
  r = await call('POST', '/api/posts', { headers: { 'x-moments-unlock': token }, body: {} })
  check('scoped token cannot create posts → 401', r.status === 401)

  // ---- custom password round-trip ----
  r = await call('PUT', '/api/settings/moments-password', { headers: AUTH, body: { password: 'custom-pass-9' } })
  check('set custom password → custom:true', r.status === 200 && r.body.data.custom === true, JSON.stringify(r.body))

  r = await call('POST', '/api/moments/unlock', { body: { password: 'custom-pass-9' } })
  check('unlock with custom password → 200', r.status === 200)
  r = await call('POST', '/api/moments/unlock', { body: { password: 'test-admin-token' } })
  check('ADMIN_TOKEN rejected while custom is set → 401', r.status === 401)
  r = await call('POST', '/api/moments/unlock', { body: { password: 'nope' } })
  check('wrong password → 401', r.status === 401)

  r = await call('PUT', '/api/settings/moments-password', { headers: AUTH, body: { password: '' } })
  check('clear custom password', r.status === 200 && r.body.data.custom === false)

  // ---- moments pagination ----
  r = await call('GET', '/api/moments?limit=1')
  check('moments limit honoured', r.body.data.length <= 1, String(r.body.data.length))
  check('moments reports total', typeof r.body.total === 'number')

  // ---- CORS advertises the unlock header ----
  const corsRes = mockRes()
  await handler(mockReq('OPTIONS', '/api/moments'), corsRes)
  check('CORS allows X-Moments-Unlock',
    String(corsRes.headers['access-control-allow-headers'] || '').toLowerCase().includes('x-moments-unlock'),
    String(corsRes.headers['access-control-allow-headers']))
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
