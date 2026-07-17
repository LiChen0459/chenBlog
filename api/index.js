import { getPostsRepo, getMomentsRepo } from '../server/repositories/index.js'

function json(res, data, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve({}) } })
  })
}

function checkAuth(req) {
  const token = process.env.ADMIN_TOKEN
  if (!token) return false
  return req.headers.authorization === `Bearer ${token}`
}

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x')
  const p = u.pathname
  const m = req.method

  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (m === 'OPTIONS') return res.end()

    if (p === '/api/health' && m === 'GET')
      return json(res, { ok: true, time: new Date().toISOString() })

    if (p === '/api/auth' && m === 'GET') {
      if (!checkAuth(req)) return json(res, { ok: false, error: 'Invalid token' }, 401)
      return json(res, { ok: true })
    }

    // Backup: all posts + moments in one call
    if (p === '/api/backup' && m === 'GET') {
      if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
      const [pr, mr] = await Promise.all([getPostsRepo(), getMomentsRepo()])
      const [allPosts, allMoments] = await Promise.all([pr.getAll({}), mr.getAll({})])
      return json(res, {
        ok: true,
        data: {
          exported_at: new Date().toISOString(),
          posts: allPosts,
          moments: allMoments,
        }
      })
    }

    const postsRepo = await getPostsRepo()

    if (p === '/api/posts' && m === 'GET') {
      const limit = u.searchParams.get('limit')
      const page = parseInt(u.searchParams.get('page')) || 1
      const posts = await postsRepo.getAll({ limit: limit ? Number(limit) : undefined })
      if (!limit) {
        // Pagination for full list
        const perPage = 10
        const start = (page - 1) * perPage
        return json(res, { ok: true, data: posts.slice(start, start + perPage), total: posts.length, page, perPage })
      }
      return json(res, { ok: true, data: posts, total: posts.length })
    }

    if (p === '/api/posts' && m === 'POST') {
      if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
      const b = await readBody(req)
      const post = await postsRepo.create({ title: b.title || '无标题', date: b.date || new Date().toISOString().slice(0, 10), summary: b.summary || '', content: b.content || '', tags: b.tags || [] })
      return json(res, { ok: true, data: post }, 201)
    }

    const pid = p.match(/^\/api\/posts\/(\d+)$/)
    if (pid) {
      const id = Number(pid[1])
      if (m === 'GET') {
        const post = await postsRepo.getById(id)
        if (!post) return json(res, { ok: false, error: '文章不存在' }, 404)
        return json(res, { ok: true, data: post })
      }
      if (m === 'PUT') {
        if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
        const post = await postsRepo.update(id, await readBody(req))
        return json(res, { ok: true, data: post })
      }
      if (m === 'DELETE') {
        if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
        await postsRepo.delete(id)
        return json(res, { ok: true, data: { deleted: true } })
      }
      if (m === 'PATCH' && p.endsWith('/pin')) {
        if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
        const r = await postsRepo.togglePin(id)
        return json(res, { ok: true, data: r })
      }
    }

    const momentsRepo = await getMomentsRepo()

    if (p === '/api/moments' && m === 'GET') {
      const limit = u.searchParams.get('limit')
      const moments = await momentsRepo.getAll({ limit: limit ? Number(limit) : undefined })
      return json(res, { ok: true, data: moments, total: moments.length })
    }
    if (p === '/api/moments' && m === 'POST') {
      if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
      const b = await readBody(req)
      const moment = await momentsRepo.create({ date: b.date, time: b.time, content: b.content, image: b.image || null, tags: b.tags || [] })
      return json(res, { ok: true, data: moment }, 201)
    }
    const mid = p.match(/^\/api\/moments\/(\d+)$/)
    if (mid) {
      const id = Number(mid[1])
      if (m === 'PUT') {
        if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
        const moment = await momentsRepo.update(id, await readBody(req))
        return json(res, { ok: true, data: moment })
      }
      if (m === 'DELETE') {
        if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
        await momentsRepo.delete(id)
        return json(res, { ok: true, data: { deleted: true } })
      }
    }

    if (p === '/api/upload' && m === 'POST') {
      if (!checkAuth(req)) return json(res, { ok: false, error: '未授权' }, 401)
      const { file, filename, mime } = await parseMultipart(req)
      if (!file) return json(res, { ok: false, error: '未选择文件' }, 400)
      const { put } = await import('@vercel/blob')
      const token = process.env.BLOB_READ_WRITE_TOKEN
      const ext = (filename || 'img').split('.').pop() || 'jpg'
      const blob = await put(`moments/${Date.now()}.${ext}`, file, { access: 'public', contentType: mime || 'image/jpeg', token })
      return json(res, { ok: true, data: { url: blob.url } })
    }

    json(res, { ok: false, error: 'Not found' }, 404)
  } catch (e) {
    json(res, { ok: false, error: e.message || 'Server error' }, 500)
  }
}

function parseMultipart(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const buf = Buffer.concat(chunks)
      const ct = req.headers['content-type'] || ''
      const boundary = ct.split('boundary=')[1]
      if (!boundary) return resolve({})
      const parts = buf.toString('binary').split('--' + boundary)
      for (const part of parts) {
        if (!part.includes('Content-Disposition')) continue
        const m1 = part.match(/name="([^"]+)"/), m2 = part.match(/filename="([^"]+)"/)
        const cm = part.match(/Content-Type:\s*(\S+)/i)
        const ds = part.indexOf('\r\n\r\n')
        if (ds === -1) continue
        const raw = part.slice(ds + 4).replace(/\r?\n--$/, '').replace(/\r?\n$/, '')
        const fileBuf = Buffer.from(raw, 'binary')
        if (m2 && fileBuf.length > 0)
          return resolve({ file: fileBuf, filename: m2[1], mime: cm ? cm[1] : 'image/jpeg' })
      }
      resolve({})
    })
  })
}
