/**
 * Covers the second feature batch: category / tag / year filters, full-text
 * search, taxonomy, standalone pages, the guestbook and the XML feeds
 * (RSS / Atom / sitemap). Exercises both entry points — createApp() (the Hono
 * routes the node server mounts) and api/index.js (the Vercel serverless
 * handler production actually runs) — and restores every fixture afterwards.
 */
import { EventEmitter } from 'node:events'
import { readFile, writeFile } from 'node:fs/promises'
import { createApp } from '../app.js'
import { feedApp } from '../routes/feeds.js'

process.env.USE_LOCAL_DATA = '1'
process.env.ADMIN_TOKEN = 'test-admin-token'

const postsFile = new URL('../data/posts.json', import.meta.url)
const pagesFile = new URL('../data/pages.json', import.meta.url)
const messagesFile = new URL('../data/messages.json', import.meta.url)

const postsBackup = await readFile(postsFile, 'utf-8')
const pagesBackup = await readFile(pagesFile, 'utf-8')
const messagesBackup = await readFile(messagesFile, 'utf-8')

// A tiny but complete archive: a two-level category tree with a three-level
// leaf, an uncategorised post, shared tags across categories, and one pinned
// recent article. One title carries XML-hostile characters on purpose.
const SEED_POSTS = [
  { id: 1, title: '深入理解 Vue 3 响应式原理', date: '2026-05-10', summary: '响应式系统的实现细节', category: '技术/前端', tags: ['vue', 'vite'], content: '依赖收集与 effect 调度……', pinned: false },
  { id: 2, title: 'CSS 容器查询实战', date: '2026-03-02', summary: '容器查询让组件自适应容器', category: '技术/前端', tags: ['css'], content: 'container-type 是核心属性……', pinned: false },
  { id: 3, title: '我的 2026 技术栈', date: '2025-12-15', summary: '一年一度的技术盘点', category: '技术', tags: ['vue'], content: '今年主力是 Vue 和 Hono……', pinned: false },
  { id: 4, title: '周末随笔', date: '2025-08-08', summary: '生活碎片', category: '随笔', tags: [], content: '去公园走了走……', pinned: false },
  { id: 5, title: '未分类的随想', date: '2024-01-31', summary: '', category: '', tags: ['随笔'], content: '一些零散想法……', pinned: false },
  { id: 6, title: 'Vue 编译器探秘 & <模板> 编译', date: '2026-09-01', summary: '编译时优化', category: '技术/前端/Vue', tags: ['vue'], content: '静态提升与补丁标记……', pinned: true },
]

const SEED_PAGES = [
  { id: 1, slug: 'about', title: '关于我', content: '你好，我是 Chen。', created_at: '2026-10-01T08:00:00.000Z', updated_at: '2026-10-01T08:00:00.000Z' },
  { id: 2, slug: 'friends', title: '友情链接', content: '- [示例](https://example.com)', created_at: '2026-10-02T08:00:00.000Z', updated_at: '2026-10-02T08:00:00.000Z' },
  { id: 3, slug: 'contact', title: '联系方式', content: '邮箱：hi@example.com', created_at: '2026-10-03T08:00:00.000Z', updated_at: '2026-10-03T08:00:00.000Z' },
]

const SEED_MESSAGES = [
  { id: 1, nickname: '访客小王', content: '写得很清楚，受教了！', hidden: false, created_at: '2026-10-16T08:12:58.874Z' },
  { id: 2, nickname: '匿名', content: '请问留言板支持 Markdown 吗？', hidden: false, created_at: '2026-10-15T11:12:58.874Z' },
  { id: 3, nickname: 'spam-bot', content: 'CHEAP WATCHES!!! click here', hidden: true, created_at: '2026-10-14T11:12:58.874Z' },
]

await writeFile(postsFile, JSON.stringify(SEED_POSTS, null, 2), 'utf-8')
await writeFile(pagesFile, JSON.stringify(SEED_PAGES, null, 2), 'utf-8')
await writeFile(messagesFile, JSON.stringify(SEED_MESSAGES, null, 2), 'utf-8')

const app = createApp()
const feeds = feedApp()
const AUTH = { Authorization: 'Bearer test-admin-token' }

let pass = 0, fail = 0
const check = (n, c, x = '') => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n} ${x}`))
const ids = (body) => (body?.data ?? []).map((p) => p.id)

/* ── api/index.js (Vercel entry) — the production code path, plus the
   minimal req/res mock it needs ── */
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
  return { status: res.statusCode, headers: res.headers, body, text: res._body }
}

const get = (path, headers) => app.request(path, { headers })
const hiddenCount = (body) => (body?.data ?? []).filter((m) => m.hidden).length

try {
  console.log('\n── taxonomy & filters (Hono routes) ──')

  let r = await (await get('/api/posts/taxonomy')).json()
  const catCount = (path) => r.data.categories.find((c) => c.path === path)?.count
  check('taxonomy has categories + tags', Array.isArray(r.data.categories) && Array.isArray(r.data.tags))
  check('parent node counts every child post', catCount('技术') === 4, JSON.stringify(r.data.categories))
  check('mid-level node counted', catCount('技术/前端') === 3, String(catCount('技术/前端')))
  check('three-level leaf registered', catCount('技术/前端/Vue') === 1, String(catCount('技术/前端/Vue')))
  check('uncategorised post adds no category', catCount('随笔') === 1 && !r.data.categories.some((c) => c.path === ''))
  check('most-used category sorts first', r.data.categories[0].path === '技术', r.data.categories[0]?.path)
  check('tag cloud carries counts', r.data.tags.find((t) => t.name === 'vue')?.count === 3, JSON.stringify(r.data.tags))
  check('most-used tag sorts first', r.data.tags[0].name === 'vue', r.data.tags[0]?.name)

  r = await (await get('/api/posts?category=' + encodeURIComponent('技术/前端'))).json()
  check('category filter is exact (child leaf excluded)', JSON.stringify(ids(r)) === '[1,2]', JSON.stringify(ids(r)))
  check('category filter reports total', r.total === 2, String(r.total))

  r = await (await get('/api/posts?category=' + encodeURIComponent('技术'))).json()
  check('top-level category returns its own post only', JSON.stringify(ids(r)) === '[3]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?tag=vue')).json()
  check('tag filter spans categories', JSON.stringify(ids(r).sort()) === '[1,3,6]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?tag=' + encodeURIComponent('随笔'))).json()
  check('tag equal to another post category stays distinct', JSON.stringify(ids(r)) === '[5]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?year=2025')).json()
  check('year filter matches the date prefix', JSON.stringify(ids(r)) === '[3,4]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?year=2024')).json()
  check('year filter on the lone 2024 post', JSON.stringify(ids(r)) === '[5]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?category=' + encodeURIComponent('技术/前端') + '&tag=vue')).json()
  check('filters combine with AND', JSON.stringify(ids(r)) === '[1]', JSON.stringify(ids(r)))

  r = await (await get('/api/posts?category=' + encodeURIComponent('不存在'))).json()
  check('unknown category → empty', r.data.length === 0 && r.total === 0)

  r = await (await get('/api/posts?tag=vue&limit=2')).json()
  check('filtered list still paginates', ids(r).length === 2 && r.hasMore === true)

  console.log('\n── search (Hono routes) ──')

  r = await (await get('/api/posts/search?q=Vue')).json()
  check('title matches rank first, newest first', ids(r)[0] === 6, JSON.stringify(ids(r)))
  check('search finds every matching post', ids(r).includes(1) && ids(r).includes(3), JSON.stringify(ids(r)))

  r = await (await get('/api/posts/search?q=' + encodeURIComponent('响应式'))).json()
  check('unique keyword → single hit', ids(r).length === 1 && ids(r)[0] === 1, JSON.stringify(ids(r)))

  r = await (await get('/api/posts/search?q=Vue')).json()
  check('search results carry content for snippets', typeof r.data[0].content === 'string')

  const empty = await get('/api/posts/search?q=')
  check('empty keyword → 400', empty.status === 400, String(empty.status))

  r = await (await get('/api/posts/search?q=' + encodeURIComponent('绝对不存在的词zzz'))).json()
  check('no match → empty list, still 200', r.ok === true && r.data.length === 0)

  r = await (await get('/api/posts/search?q=Vue&limit=1')).json()
  check('search limit honoured', r.data.length === 1, String(r.data.length))

  console.log('\n── standalone pages (Hono routes) ──')

  r = await (await get('/api/pages')).json()
  check('page list returns all pages', r.total === 3 && r.data.every((p) => p.slug && p.content !== undefined))
  r = await (await get('/api/pages/about')).json()
  check('page by slug', r.data.title === '关于我' && r.data.content.length > 0, JSON.stringify(r.data).slice(0, 80))
  const missing = await get('/api/pages/no-such-page')
  check('unknown slug → 404', missing.status === 404, String(missing.status))

  const noAuth = await app.request('/api/pages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'x', title: 'X' }),
  })
  check('create page without auth → 401', noAuth.status === 401, String(noAuth.status))

  const taken = await app.request('/api/pages', {
    method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'about', title: '占用' }),
  })
  check('duplicate slug → 400', taken.status === 400, String(taken.status))

  // normaliseSlug salvages spacing/punctuation ("about me!" → "about-me") —
  // that is deliberate, so the admin form never fights the user over hyphens.
  // A slug with no salvageable characters at all is still rejected.
  const salvaged = await app.request('/api/pages', {
    method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'about me!', title: '坏地址' }),
  })
  check('unsafe characters are normalised, not rejected', salvaged.status === 201 && (await salvaged.json()).data.slug === 'about-me', String(salvaged.status))
  const salvageDeleted = await app.request('/api/pages/about-me', { method: 'DELETE', headers: AUTH })
  check('salvaged page can be deleted', salvageDeleted.status === 200, String(salvageDeleted.status))

  const badSlug = await app.request('/api/pages', {
    method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: '关于我', title: '坏地址' }),
  })
  check('slug with no safe characters → 400', badSlug.status === 400, String(badSlug.status))

  const created = await app.request('/api/pages', {
    method: 'POST', headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'notes', title: '笔记', content: '第一段' }),
  })
  check('create page → 201', created.status === 201, String(created.status))
  check('created page is retrievable', (await (await get('/api/pages/notes')).json()).data.content === '第一段')

  const renamed = await app.request('/api/pages/notes', {
    method: 'PUT', headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '我的笔记' }),
  })
  check('update page → 200', renamed.status === 200 && (await renamed.json()).data.title === '我的笔记')

  const noAuthDel = await app.request('/api/pages/notes', { method: 'DELETE' })
  check('delete page without auth → 401', noAuthDel.status === 401, String(noAuthDel.status))

  const deleted = await app.request('/api/pages/notes', { method: 'DELETE', headers: AUTH })
  check('delete page → 200', deleted.status === 200, String(deleted.status))
  check('deleted page is gone', (await get('/api/pages/notes')).status === 404)
  check('deleting again → 404', (await app.request('/api/pages/notes', { method: 'DELETE', headers: AUTH })).status === 404)

  console.log('\n── guestbook (Hono routes) ──')

  r = await (await get('/api/messages')).json()
  check('anonymous list hides the hidden message', hiddenCount(r) === 0 && r.data.every((m) => !m.hidden), JSON.stringify(r.data))
  check('anonymous list has the 2 visible ones', r.data.length === 2 && r.total === 2, String(r.total))
  check('messages carry the date/time pair', typeof r.data[0].date === 'string' && typeof r.data[0].time === 'string')

  r = await (await get('/api/messages', AUTH)).json()
  check('admin list includes hidden', r.data.length === 3 && hiddenCount(r) === 1, String(r.data.length))

  const posted = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: '路人甲', content: '写得好！' }),
  })
  check('post a message → 201', posted.status === 201, String(posted.status))
  const postedBody = await posted.json()
  check('posted message keeps the nickname', postedBody.data.nickname === '路人甲', JSON.stringify(postedBody.data))

  r = await (await get('/api/messages')).json()
  check('new message is visible immediately', r.data.length === 3 && r.data[0].content === '写得好！', JSON.stringify(r.data.map((m) => m.content)))

  const blank = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '   ' }),
  })
  check('blank content → 400', blank.status === 400, String(blank.status))

  const tooLong = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'x'.repeat(501) }),
  })
  check('over-long message → 400', tooLong.status === 400, String(tooLong.status))

  const longNick = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: 'y'.repeat(21), content: 'hi' }),
  })
  check('over-long nickname → 400', longNick.status === 400, String(longNick.status))

  const anonPost = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '没留昵称' }),
  })
  check('missing nickname defaults to 匿名', (await anonPost.json()).data.nickname === '匿名')

  const bot = await app.request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: 'bot', content: 'spam', website: 'http://spam.example' }),
  })
  const botBody = await bot.json()
  const beforeBot = (await (await get('/api/messages')).json()).data.length
  check('honeypot bot gets a fake 201', bot.status === 201 && botBody.ok === true && botBody.data === null, JSON.stringify(botBody))
  r = await (await get('/api/messages')).json()
  check('honeypot message was dropped', r.data.length === beforeBot && !r.data.some((m) => m.content === 'spam'), JSON.stringify(r.data.map((m) => m.content)))

  const patchNoAuth = await app.request('/api/messages/1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: true }),
  })
  check('hide without auth → 401', patchNoAuth.status === 401, String(patchNoAuth.status))

  const patched = await app.request('/api/messages/1', {
    method: 'PATCH', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: true }),
  })
  check('hide a message → 200', patched.status === 200 && (await patched.json()).data.hidden === true, String(patched.status))

  r = await (await get('/api/messages')).json()
  check('hidden message leaves the public list', r.data.length === 3 && !r.data.some((m) => m.id === 1), JSON.stringify(r.data.map((m) => m.id)))

  const patchedMissing = await app.request('/api/messages/999', {
    method: 'PATCH', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: true }),
  })
  check('hiding an unknown message → 404', patchedMissing.status === 404, String(patchedMissing.status))

  const delMissing = await app.request('/api/messages/999', { method: 'DELETE', headers: AUTH })
  check('deleting an unknown message → 404', delMissing.status === 404, String(delMissing.status))

  const delMsg = await app.request('/api/messages/2', { method: 'DELETE', headers: AUTH })
  check('delete a message → 200', delMsg.status === 200, String(delMsg.status))
  r = await (await get('/api/messages')).json()
  check('deleted message is gone from the public list', r.data.length === 2 && !r.data.some((m) => m.id === 2), JSON.stringify(r.data.map((m) => m.id)))

  console.log('\n── feeds & sitemap (feedApp) ──')

  process.env.SITE_URL = 'https://blog.example.com/'   // trailing slash must be trimmed
  const rss = await feeds.request('http://localhost/rss.xml')
  const rssText = await rss.text()
  check('rss → 200 + rss content-type', rss.status === 200 && rss.headers.get('content-type').includes('application/rss+xml'), rss.headers.get('content-type'))
  check('rss is cacheable', rss.headers.get('cache-control') === 'public, max-age=300', rss.headers.get('cache-control'))
  check('rss declares the channel', rssText.includes('<rss version="2.0"') && rssText.includes('<language>zh-CN</language>'))
  check('rss links are absolute (SITE_URL wins, slash trimmed)', rssText.includes('<link>https://blog.example.com/blog/1</link>'), rssText.slice(0, 400))
  check('rss item titles are XML-escaped', rssText.includes('<title>Vue 编译器探秘 &amp; &lt;模板&gt; 编译</title>') && !rssText.includes('<模板>'), 'raw angle bracket leaked')
  check('rss carries categories', rssText.includes('<category>vue</category>'))
  check('rss has a self link + pubDate', rssText.includes('rel="self"') && rssText.includes('<pubDate>'))

  const atom = await feeds.request('http://localhost/atom.xml')
  const atomText = await atom.text()
  check('atom → 200 + atom content-type', atom.status === 200 && atom.headers.get('content-type').includes('application/atom+xml'), atom.headers.get('content-type'))
  check('atom declares feed + self link', atomText.includes('<feed xmlns="http://www.w3.org/2005/Atom"') && atomText.includes('/atom.xml" rel="self"'))
  check('atom entries link to the post', atomText.includes('<link href="https://blog.example.com/blog/6" rel="alternate"'))

  const sitemap = await feeds.request('http://localhost/sitemap.xml')
  const sitemapText = await sitemap.text()
  check('sitemap → 200 + xml content-type', sitemap.status === 200 && sitemap.headers.get('content-type').includes('application/xml'), sitemap.headers.get('content-type'))
  check('sitemap covers the static routes', ['<loc>https://blog.example.com/</loc>', '<loc>https://blog.example.com/blog</loc>', '<loc>https://blog.example.com/moments</loc>', '<loc>https://blog.example.com/archive</loc>', '<loc>https://blog.example.com/guestbook</loc>'].every((s) => sitemapText.includes(s)))
  check('sitemap covers standalone pages', sitemapText.includes('<loc>https://blog.example.com/page/about</loc>'))
  check('sitemap covers top-level categories only', sitemapText.includes('<loc>https://blog.example.com/category/%E6%8A%80%E6%9C%AF</loc>') && !sitemapText.includes('/category/%E6%8A%80%E6%9C%AF%2F'), 'child category node leaked')
  check('sitemap covers tags', sitemapText.includes('<loc>https://blog.example.com/tag/vue</loc>'))
  check('sitemap covers every post', [1, 2, 3, 4, 5, 6].every((id) => sitemapText.includes(`<loc>https://blog.example.com/blog/${id}</loc>`)))
  check('pinned post gets higher priority', sitemapText.includes('<priority>0.9</priority>'))

  const unknownFeed = await feeds.request('http://localhost/nope.xml')
  check('unknown feed path → 404', unknownFeed.status === 404, String(unknownFeed.status))

  delete process.env.SITE_URL
  const devRss = await feeds.request('http://localhost:5173/rss.xml')
  check('without SITE_URL the request origin is used', (await devRss.text()).includes('<link>http://localhost:5173/blog/1</link>'))

  console.log('\n── api/index.js (Vercel entry) parity ──')

  let e = await callEntry('GET', '/api/posts/taxonomy')
  check('entry: taxonomy → 200 + tree', e.status === 200 && e.body.data.categories.length >= 4, JSON.stringify(e.body).slice(0, 120))

  e = await callEntry('GET', '/api/posts/search?q=Vue')
  check('entry: search → 200 + hits', e.status === 200 && e.body.data.length >= 3, JSON.stringify(e.body).slice(0, 120))
  e = await callEntry('GET', '/api/posts/search?q=')
  check('entry: empty keyword → 400', e.status === 400, String(e.status))

  e = await callEntry('GET', '/api/pages')
  check('entry: page list', e.status === 200 && e.body.total === 3, String(e.body?.total))
  e = await callEntry('GET', '/api/pages/about')
  check('entry: page by slug', e.status === 200 && e.body.data.title === '关于我')
  e = await callEntry('GET', '/api/pages/nope')
  check('entry: unknown slug → 404', e.status === 404, String(e.status))
  e = await callEntry('POST', '/api/pages', { body: { slug: 'entry-page', title: '入口测试' } })
  check('entry: create page without auth → 401', e.status === 401, String(e.status))
  e = await callEntry('POST', '/api/pages', { headers: { authorization: 'Bearer test-admin-token' }, body: { slug: 'entry-page', title: '入口测试' } })
  check('entry: create page with auth → 201', e.status === 201, String(e.status))
  e = await callEntry('GET', '/api/pages/entry-page')
  check('entry: created page retrievable', e.status === 200 && e.body.data.title === '入口测试')
  e = await callEntry('DELETE', '/api/pages/entry-page', { headers: { authorization: 'Bearer test-admin-token' } })
  check('entry: delete page → 200', e.status === 200, String(e.status))
  e = await callEntry('GET', '/api/pages/entry-page')
  check('entry: deleted page → 404', e.status === 404, String(e.status))

  e = await callEntry('GET', '/api/messages')
  check('entry: public message list hides hidden', hiddenCount(e.body) === 0, JSON.stringify(e.body.data))
  e = await callEntry('POST', '/api/messages', { body: { content: '来自入口的留言' } })
  check('entry: post message → 201', e.status === 201 && e.body.data.nickname === '匿名', JSON.stringify(e.body.data))
  e = await callEntry('POST', '/api/messages', { body: { content: 'spam', website: 'x' } })
  check('entry: honeypot → fake 201, nothing stored', e.status === 201 && e.body.data === null, JSON.stringify(e.body))
  e = await callEntry('GET', '/api/messages')
  check('entry: honeypot message never stored', e.body.data.length === 3 && !e.body.data.some((m) => m.content === 'spam'), JSON.stringify(e.body.data.map((m) => m.content)))
  e = await callEntry('PATCH', '/api/messages/1', { body: { hidden: true } })
  check('entry: hide without auth → 401', e.status === 401, String(e.status))

  e = await callEntry('GET', '/rss.xml', { headers: { host: 'feed.example.com', 'x-forwarded-proto': 'https' } })
  check('entry: /rss.xml served with real host links', e.status === 200 && e.text.includes('<link>https://feed.example.com/blog/1</link>'), e.text.slice(0, 200))
  check('entry: rss content-type passthrough', String(e.headers['content-type']).includes('application/rss+xml'), String(e.headers['content-type']))
  e = await callEntry('GET', '/atom.xml', { headers: { host: 'feed.example.com', 'x-forwarded-proto': 'https' } })
  check('entry: /atom.xml served', e.status === 200 && e.text.includes('http://www.w3.org/2005/Atom'))
  e = await callEntry('GET', '/sitemap.xml', { headers: { host: 'feed.example.com', 'x-forwarded-proto': 'https' } })
  check('entry: /sitemap.xml served', e.status === 200 && e.text.includes('<loc>https://feed.example.com/blog/6</loc>'), e.text.slice(0, 200))

  e = await callEntry('GET', '/api/backup', { headers: { authorization: 'Bearer test-admin-token' } })
  check('entry: backup includes pages + messages', e.status === 200 && Array.isArray(e.body.data.pages) && Array.isArray(e.body.data.messages), JSON.stringify(Object.keys(e.body?.data || {})))
} catch (err) {
  fail++
  console.log('  ❌ threw:', err.stack)
} finally {
  await writeFile(postsFile, postsBackup, 'utf-8')
  await writeFile(pagesFile, pagesBackup, 'utf-8')
  await writeFile(messagesFile, messagesBackup, 'utf-8')
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed — data restored.\n`)
  process.exit(fail === 0 ? 0 : 1)
}
