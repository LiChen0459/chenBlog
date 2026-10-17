/**
 * Login captcha (人机验证): GET /api/auth must refuse every request that
 * does not carry a server-signed, correctly-answered captcha token — the
 * browser-only check this replaces stopped nothing, the endpoint was still
 * scriptable. Also covers the public challenge endpoint and that a solved
 * captcha stays reusable (the client re-sends it when re-verifying a stored
 * token after a refresh).
 */
import { EventEmitter } from 'node:events'
import { createApp } from '../app.js'
import {
  signCaptchaToken,
  verifyCaptchaToken,
  signUnlockToken,
  makeCaptcha,
} from '../repositories/utils.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const AUTH = 'Bearer test-admin-token'
let pass = 0, fail = 0
const check = (n, c, x = '') => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n} ${x}`))

const app = createApp()

/* ── api/index.js (Vercel entry) with a minimal req/res mock ── */
const { default: entryHandler } = await import('../../api/index.js')

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

async function callEntry(method, url, opts) {
  const req = mockReq(method, url, opts)
  const res = mockRes()
  const done = new Promise((r) => res.on('_done', r))
  await entryHandler(req, res)
  await done
  let body = null
  try { body = JSON.parse(res._body) } catch {}
  return { status: res.statusCode, headers: res.headers, body }
}

/** Solve the plaintext question served by the challenge endpoint. */
function solve(question) {
  const m = String(question).match(/^(\d+)\s*([-+])\s*(\d+)\s*=/)
  if (!m) return NaN
  const [, a, op, b] = m
  return op === '-' ? Number(a) - Number(b) : Number(a) + Number(b)
}

try {
  console.log('\n── captcha token unit checks ──')

  check('correct answer verifies', verifyCaptchaToken(signCaptchaToken(2, 3, '+'), '5'))
  check('subtraction verifies', verifyCaptchaToken(signCaptchaToken(5, 2, '-'), '3'))
  check('wrong answer rejected', !verifyCaptchaToken(signCaptchaToken(2, 3, '+'), '6'))
  check('operator confusion rejected', !verifyCaptchaToken(signCaptchaToken(5, 2, '-'), '7'))
  check('missing answer rejected', !verifyCaptchaToken(signCaptchaToken(2, 3, '+')))
  check('garbage token rejected', !verifyCaptchaToken('not-a-token', '5'))
  check('tampered payload rejected', !verifyCaptchaToken(
    `${Buffer.from(JSON.stringify({ s: 'captcha', a: 9, b: 9, op: '+', exp: Date.now() + 60000 })).toString('base64url')}.deadbeef`,
    '18'
  ))
  // The moments unlock token is signed with the same secret but a different
  // scope — it must never pass as a captcha.
  check('unlock token is scope-bound', !verifyCaptchaToken(signUnlockToken(), '0'))
  check('makeCaptcha shape', /^(\d+) ([-+]) (\d+) = \?$/.test(makeCaptcha().question) && typeof makeCaptcha().token === 'string')

  console.log('\n── /api/auth gate (Hono routes) ──')

  let cap = await (await app.request('/api/auth/challenge')).json()
  check('challenge → 200 + question + token',
    cap.ok === true && /^\d+ [-+] \d+ = \?$/.test(cap.data.question) && typeof cap.data.token === 'string',
    JSON.stringify(cap).slice(0, 120))

  let r = await app.request('/api/auth', { headers: { Authorization: AUTH } })
  check('no captcha → 401 CAPTCHA_INVALID',
    r.status === 401 && (await r.json()).code === 'CAPTCHA_INVALID', String(r.status))

  r = await app.request('/api/auth', {
    headers: { Authorization: AUTH, 'X-Captcha-Token': 'garbage', 'X-Captcha-Answer': '5' },
  })
  check('garbage captcha token → 401', r.status === 401 && (await r.json()).code === 'CAPTCHA_INVALID', String(r.status))

  const answer = solve(cap.data.question)
  r = await app.request('/api/auth', {
    headers: { Authorization: AUTH, 'X-Captcha-Token': cap.data.token, 'X-Captcha-Answer': String(answer + 1) },
  })
  check('wrong answer → 401', r.status === 401 && (await r.json()).code === 'CAPTCHA_INVALID', String(r.status))

  r = await app.request('/api/auth', {
    headers: { Authorization: 'Bearer wrong-password', 'X-Captcha-Token': cap.data.token, 'X-Captcha-Answer': String(answer) },
  })
  check('right captcha + wrong password → 401', r.status === 401 && (await r.json()).code === 'UNAUTHORIZED', String(r.status))

  r = await app.request('/api/auth', {
    headers: { Authorization: AUTH, 'X-Captcha-Token': cap.data.token, 'X-Captcha-Answer': String(answer) },
  })
  check('right captcha + right password → 200', r.status === 200 && (await r.json()).ok === true, String(r.status))

  // The client keeps the solved captcha and re-sends it when re-verifying a
  // stored token after a refresh — it must keep working within the TTL.
  r = await app.request('/api/auth', {
    headers: { Authorization: AUTH, 'X-Captcha-Token': cap.data.token, 'X-Captcha-Answer': String(answer) },
  })
  check('solved captcha is reusable within its TTL', r.status === 200, String(r.status))

  console.log('\n── /api/auth gate (Vercel entry parity) ──')

  let e = await callEntry('GET', '/api/auth/challenge')
  check('entry: challenge → 200 + question', e.status === 200 && /^\d+ [-+] \d+ = \?$/.test(e.body.data.question), JSON.stringify(e.body).slice(0, 120))

  e = await callEntry('GET', '/api/auth', { headers: { authorization: AUTH } })
  check('entry: no captcha → 401 CAPTCHA_INVALID',
    e.status === 401 && e.body.code === 'CAPTCHA_INVALID', String(e.status))

  const entryCap = (await callEntry('GET', '/api/auth/challenge')).body.data

  e = await callEntry('GET', '/api/auth', {
    headers: { authorization: 'Bearer wrong-password', 'x-captcha-token': entryCap.token, 'x-captcha-answer': String(solve(entryCap.question)) },
  })
  // The Vercel entry answers the password check with a plain 401 (no code
  // field) — the captcha gate already returned CAPTCHA_INVALID earlier, so
  // reaching this branch at all proves the captcha passed.
  check('entry: right captcha + wrong password → 401', e.status === 401 && e.body.error === '密码错误', JSON.stringify(e.body))

  e = await callEntry('GET', '/api/auth', {
    headers: { authorization: AUTH, 'x-captcha-token': entryCap.token, 'x-captcha-answer': String(solve(entryCap.question)) },
  })
  check('entry: right captcha + right password → 200', e.status === 200 && e.body.ok === true, String(e.status))
} catch (err) {
  fail++
  console.log('  ❌ threw:', err.stack)
} finally {
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
