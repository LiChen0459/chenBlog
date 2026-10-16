/**
 * Verifies the settings store, the custom moments password, and scoped unlock
 * tokens. Runs against the local JSON repo; restores data afterwards.
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import { createApp } from '../app.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const momentsFile = new URL('../data/moments.json', import.meta.url)
const settingsFile = new URL('../data/settings.json', import.meta.url)

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

const unlock = (password) =>
  req('/api/moments/unlock', { method: 'POST', headers: J, body: JSON.stringify({ password }) })

const listWith = (token) =>
  req('/api/moments', { headers: { 'X-Moments-Unlock': token } })

// The fixture holds several moments and more than one may be flagged hidden, so
// assert on what actually matters: an unauthorised caller must see *zero* hidden
// entries, an authorised one must see at least one. Never assert raw totals —
// that couples the test to whatever the seed data happens to contain.
const hiddenIn = (body) => (body?.data ?? []).filter((m) => m.hidden).length

try {
  console.log('\n── settings + custom moments password ──')

  // Hide the seeded moment so there is something to reveal.
  await req('/api/moments/1', { method: 'PUT', headers: { ...AUTH, ...J }, body: JSON.stringify({ hidden: true }) })

  // ---- settings endpoint is admin-only ----
  let r = await req('/api/settings/moments-password')
  check('GET settings without auth → 401', r.status === 401, JSON.stringify(r.body))

  r = await req('/api/settings/moments-password', { headers: AUTH })
  check('GET settings with auth → 200', r.status === 200)
  check('reports custom:false initially', r.body.data?.custom === false, JSON.stringify(r.body))
  check('never leaks a hash', !JSON.stringify(r.body).includes('scrypt'), JSON.stringify(r.body))

  // ---- default password is ADMIN_TOKEN ----
  r = await unlock('test-admin-token')
  check('unlock with ADMIN_TOKEN → 200', r.status === 200, JSON.stringify(r.body))
  const defaultToken = r.body.data?.token
  check('unlock returns a token', typeof defaultToken === 'string' && defaultToken.includes('.'))
  check('token is NOT the admin token', defaultToken !== 'test-admin-token')

  r = await listWith(defaultToken)
  check('unlock token reveals hidden moments', hiddenIn(r.body) >= 1,
    JSON.stringify(r.body))

  r = await unlock('wrong-password')
  check('unlock with wrong password → 401', r.status === 401, JSON.stringify(r.body))

  // ---- tampered / bogus tokens are rejected ----
  r = await listWith('garbage')
  check('garbage unlock token reveals no hidden entries', hiddenIn(r.body) === 0, JSON.stringify(r.body))

  const [payload, sig] = defaultToken.split('.')
  const tampered = `${payload.slice(0, -2)}XX.${sig}`
  r = await listWith(tampered)
  check('tampered payload rejected', hiddenIn(r.body) === 0, JSON.stringify(r.body))

  r = await listWith(`${payload}.${sig.slice(0, -2)}YY`)
  check('tampered signature rejected', hiddenIn(r.body) === 0, JSON.stringify(r.body))

  // ---- set a custom password ----
  r = await req('/api/settings/moments-password', {
    method: 'PUT', headers: { ...AUTH, ...J }, body: JSON.stringify({ password: 'ab' }),
  })
  check('too-short password → 400', r.status === 400, JSON.stringify(r.body))

  r = await req('/api/settings/moments-password', {
    method: 'PUT', headers: { ...AUTH, ...J }, body: JSON.stringify({ password: 'my-secret-pass' }),
  })
  check('set custom password → 200', r.status === 200, JSON.stringify(r.body))
  check('reports custom:true', r.body.data?.custom === true)

  const rawSettings = await readFile(settingsFile, 'utf-8')
  check('stored value is a scrypt hash, not plaintext', rawSettings.includes('scrypt$') && !rawSettings.includes('my-secret-pass'),
    rawSettings.slice(0, 120))

  r = await req('/api/settings/moments-password', { headers: AUTH })
  check('GET reports custom:true', r.body.data?.custom === true)

  // ---- custom password takes over ----
  r = await unlock('my-secret-pass')
  check('unlock with custom password → 200', r.status === 200, JSON.stringify(r.body))
  const customToken = r.body.data?.token

  r = await unlock('test-admin-token')
  check('ADMIN_TOKEN no longer works for unlock → 401', r.status === 401, JSON.stringify(r.body))

  r = await unlock('my-secret-pass ')
  check('password is trimmed (trailing space ok)', r.status === 200)

  r = await listWith(customToken)
  check('custom-password token reveals hidden', hiddenIn(r.body) >= 1, JSON.stringify(r.body))

  // admin still sees hidden regardless
  r = await req('/api/moments', { headers: AUTH })
  check('admin Bearer still reveals hidden', hiddenIn(r.body) >= 1, JSON.stringify(r.body))

  // ---- clearing falls back to ADMIN_TOKEN ----
  r = await req('/api/settings/moments-password', {
    method: 'PUT', headers: { ...AUTH, ...J }, body: JSON.stringify({ password: '' }),
  })
  check('clear custom password → 200', r.status === 200)
  check('reports custom:false', r.body.data?.custom === false)

  r = await unlock('my-secret-pass')
  check('old custom password rejected after clearing', r.status === 401)

  r = await unlock('test-admin-token')
  check('ADMIN_TOKEN works again after clearing', r.status === 200)

  // ---- scoped token must not grant admin ----
  r = await req('/api/settings/moments-password', { headers: { 'X-Moments-Unlock': customToken } })
  check('unlock token cannot read settings → 401', r.status === 401, JSON.stringify(r.body))

  r = await req('/api/posts', { method: 'POST', headers: { 'X-Moments-Unlock': customToken, ...J }, body: '{}' })
  check('unlock token cannot create posts → 401', r.status === 401, JSON.stringify(r.body))
} catch (e) {
  fail++
  console.log('  ❌ threw:', e.stack)
} finally {
  await writeFile(momentsFile, momentsBackup, 'utf-8')
  if (settingsBackup === null) await rm(settingsFile, { force: true })
  else await writeFile(settingsFile, settingsBackup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
