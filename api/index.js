import { getPostsRepo, getMomentsRepo, getImagesRepo, getSettingsRepo } from '../server/repositories/index.js'
import {
  today,
  validateImage,
  hashPassword,
  verifyPassword,
  safeEqualString,
  signUnlockToken,
  verifyUnlockToken,
  UNLOCK_TOKEN_TTL_MS,
  normaliseLimit,
  normaliseOffset,
  normaliseIds,
} from '../server/repositories/utils.js'

const MAX_BODY_BYTES = 32 * 1024 * 1024 // 32 MB across all files

const MOMENTS_PASSWORD_KEY = 'moments_password'
const UNLOCK_HEADER = 'x-moments-unlock'
const MIN_PASSWORD_LEN = 4
const MAX_PASSWORD_LEN = 128

function json(res, data, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

function checkAuth(req) {
  const token = process.env.ADMIN_TOKEN
  if (!token) return false
  return safeEqualString(req.headers.authorization, `Bearer ${token}`)
}

/** Admin, or a visitor holding a scoped unlock token. */
function canSeeHidden(req) {
  if (checkAuth(req)) return true
  return verifyUnlockToken(req.headers[UNLOCK_HEADER])
}

function unauthorized(res) {
  return json(res, { ok: false, error: '未授权' }, 401)
}

/** Minimal multipart/form-data parser — collects every part that carries a filename. */
function parseMultipart(req) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const buf = Buffer.concat(chunks)
      const ct = req.headers['content-type'] || ''
      const bm = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
      if (!bm) return resolve([])
      const boundary = (bm[1] || bm[2]).trim()
      if (!boundary) return resolve([])

      const files = []
      for (const part of buf.toString('latin1').split(`--${boundary}`)) {
        if (!part.includes('Content-Disposition')) continue
        const fm = part.match(/filename="([^"]*)"/i)
        if (!fm || !fm[1]) continue
        const ds = part.indexOf('\r\n\r\n')
        if (ds === -1) continue
        const cm = part.match(/Content-Type:\s*([^\r\n]+)/i)
        // The CRLF right before the boundary belongs to the boundary itself.
        const raw = part.slice(ds + 4).replace(/\r\n$/, '')
        files.push({
          buffer: Buffer.from(raw, 'latin1'),
          filename: fm[1],
          mime: cm ? cm[1].trim() : 'image/jpeg',
        })
      }
      resolve(files)
    })
    req.on('error', () => resolve([]))
  })
}

/** Turn a parsed multipart part into something both the Blob and fs backends accept. */
function toFile({ buffer, filename, mime }) {
  const name = filename || 'image.jpg'
  const type = mime || 'image/jpeg'
  if (typeof File === 'function') return new File([buffer], name, { type })
  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  }
}

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x')
  const p = u.pathname
  const m = req.method

  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Moments-Unlock')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    if (m === 'OPTIONS') return res.end()

    if (p === '/api/health' && m === 'GET')
      return json(res, { ok: true, time: new Date().toISOString() })

    if (p === '/api/auth' && m === 'GET') {
      if (!checkAuth(req)) return json(res, { ok: false, error: '密码错误' }, 401)
      return json(res, { ok: true })
    }

    /* ── Settings ── */
    if (p === '/api/settings/moments-password') {
      if (!checkAuth(req)) return unauthorized(res)
      const settingsRepo = await getSettingsRepo()

      if (m === 'GET') {
        const stored = await settingsRepo.get(MOMENTS_PASSWORD_KEY)
        return json(res, { ok: true, data: { custom: !!stored, minLength: MIN_PASSWORD_LEN } })
      }

      if (m === 'PUT') {
        const b = await readBody(req)
        const raw = typeof b.password === 'string' ? b.password.trim() : ''
        if (!raw) {
          await settingsRepo.delete(MOMENTS_PASSWORD_KEY)
          return json(res, { ok: true, data: { custom: false } })
        }
        if (raw.length < MIN_PASSWORD_LEN)
          return json(res, { ok: false, error: `密码至少 ${MIN_PASSWORD_LEN} 位` }, 400)
        if (raw.length > MAX_PASSWORD_LEN)
          return json(res, { ok: false, error: `密码最长 ${MAX_PASSWORD_LEN} 位` }, 400)
        try {
          await settingsRepo.set(MOMENTS_PASSWORD_KEY, await hashPassword(raw))
        } catch (e) {
          return json(
            { ok: false, error: `保存失败：${e.message}。线上库需要先执行 npm run db:migrate 建 settings 表。` },
            500,
          )
        }
        return json(res, { ok: true, data: { custom: true } })
      }

      return json(res, { ok: false, error: 'Method not allowed' }, 405)
    }

    // Backup: all posts + moments in one call
    if (p === '/api/backup' && m === 'GET') {
      if (!checkAuth(req)) return unauthorized(res)
      const [pr, mr] = await Promise.all([getPostsRepo(), getMomentsRepo()])
      const [allPosts, allMoments] = await Promise.all([
        pr.getAll({}),
        mr.getAll({ includeHidden: true }),
      ])
      return json(res, {
        ok: true,
        data: { exported_at: new Date().toISOString(), posts: allPosts, moments: allMoments },
      })
    }

    /* ── Posts ── */
    const postsRepo = await getPostsRepo()

    if (p === '/api/posts' && m === 'GET') {
      const pageParam = u.searchParams.get('page')
      const perPage = normaliseLimit(u.searchParams.get('limit'), pageParam ? 10 : null, 200)
      const offset = pageParam
        ? (Math.max(1, Number(pageParam) || 1) - 1) * perPage
        : normaliseOffset(u.searchParams.get('offset'))

      // Lean projection — list views never need the full markdown body.
      const [posts, total] = await Promise.all([
        postsRepo.getAll({ limit: perPage, offset, withContent: false }),
        typeof postsRepo.count === 'function' ? postsRepo.count() : Promise.resolve(null),
      ])

      const totalCount = total ?? posts.length
      return json(res, {
        ok: true,
        data: posts,
        total: totalCount,
        limit: perPage,
        offset,
        hasMore: perPage ? offset + posts.length < totalCount : false,
      })
    }

    if (p === '/api/posts' && m === 'POST') {
      if (!checkAuth(req)) return unauthorized(res)
      const b = await readBody(req)
      const post = await postsRepo.create({
        title: b.title || '无标题',
        date: b.date || today(),
        summary: b.summary || '',
        content: b.content || '',
        tags: b.tags || [],
        pinned: !!b.pinned,
      })
      return json(res, { ok: true, data: post }, 201)
    }

    // Bulk actions for posts: { ids, action: 'pin' | 'unpin' | 'delete' }
    if (p === '/api/posts/bulk' && m === 'POST') {
      if (!checkAuth(req)) return unauthorized(res)
      const b = await readBody(req)
      const ids = normaliseIds(b.ids)
      if (!ids.length) return json(res, { ok: false, error: '请先选择要操作的文章' }, 400)
      if (!['pin', 'unpin', 'delete'].includes(b.action)) {
        return json(res, { ok: false, error: '不支持的批量操作' }, 400)
      }
      if (b.action === 'delete') {
        if (typeof postsRepo.deleteMany !== 'function') {
          return json(res, { ok: false, error: '当前存储不支持批量删除' }, 501)
        }
        return json(res, { ok: true, data: await postsRepo.deleteMany(ids) })
      }
      if (typeof postsRepo.setPinnedMany !== 'function') {
        return json(res, { ok: false, error: '当前存储不支持批量置顶' }, 501)
      }
      return json(res, { ok: true, data: await postsRepo.setPinnedMany(ids, b.action === 'pin') })
    }

    const pid = p.match(/^\/api\/posts\/(\d+)(\/pin)?$/)
    if (pid) {
      const id = Number(pid[1])

      if (pid[2]) {
        if (m !== 'PATCH') return json(res, { ok: false, error: 'Method not allowed' }, 405)
        if (!checkAuth(req)) return unauthorized(res)
        const r = await postsRepo.togglePin(id)
        if (!r) return json(res, { ok: false, error: '文章不存在' }, 404)
        return json(res, { ok: true, data: r })
      }

      if (m === 'GET') {
        const post = await postsRepo.getById(id)
        if (!post) return json(res, { ok: false, error: '文章不存在' }, 404)
        return json(res, { ok: true, data: post })
      }
      if (m === 'PUT') {
        if (!checkAuth(req)) return unauthorized(res)
        const post = await postsRepo.update(id, await readBody(req))
        if (!post) return json(res, { ok: false, error: '文章不存在' }, 404)
        return json(res, { ok: true, data: post })
      }
      if (m === 'DELETE') {
        if (!checkAuth(req)) return unauthorized(res)
        const r = await postsRepo.delete(id)
        if (!r) return json(res, { ok: false, error: '文章不存在' }, 404)
        return json(res, { ok: true, data: r })
      }
    }

    /* ── Moments ── */
    const momentsRepo = await getMomentsRepo()

    if (p === '/api/moments' && m === 'GET') {
      const includeHidden = canSeeHidden(req)
      const limit = normaliseLimit(u.searchParams.get('limit'), null, 100)
      const offset = normaliseOffset(u.searchParams.get('offset'))

      const [moments, total] = await Promise.all([
        momentsRepo.getAll({ limit, offset, includeHidden }),
        typeof momentsRepo.count === 'function' ? momentsRepo.count({ includeHidden }) : Promise.resolve(null),
      ])

      const totalCount = total ?? moments.length
      return json(res, {
        ok: true,
        data: moments,
        total: totalCount,
        limit,
        offset,
        hasMore: limit ? offset + moments.length < totalCount : false,
      })
    }

    // Public: how many moments are hidden (drives the "unlock" affordance).
    if (p === '/api/moments/hidden-count' && m === 'GET') {
      const count = typeof momentsRepo.countHidden === 'function' ? await momentsRepo.countHidden() : 0
      return json(res, { ok: true, data: { count } })
    }

    // Public: exchange the moments password for a scoped, expiring token.
    if (p === '/api/moments/unlock' && m === 'POST') {
      const adminToken = process.env.ADMIN_TOKEN
      if (!adminToken) return json(res, { ok: false, error: '服务端未配置 ADMIN_TOKEN' }, 500)

      const b = await readBody(req)
      // Trimmed to match how the password is stored (see the settings route above).
      const password = typeof b.password === 'string' ? b.password.trim() : ''
      if (!password) return json(res, { ok: false, error: '请输入密码' }, 400)

      const settingsRepo = await getSettingsRepo()
      const stored = await settingsRepo.get(MOMENTS_PASSWORD_KEY)
      const ok = stored
        ? await verifyPassword(password, stored)
        : safeEqualString(password, adminToken)

      if (!ok) return json(res, { ok: false, error: '密码不正确' }, 401)
      return json(res, { ok: true, data: { token: signUnlockToken(), expiresIn: UNLOCK_TOKEN_TTL_MS } })
    }

    if (p === '/api/moments' && m === 'POST') {
      if (!checkAuth(req)) return unauthorized(res)
      const b = await readBody(req)
      const moment = await momentsRepo.create({
        date: b.date || today(),
        time: b.time,
        content: b.content || '',
        images: b.images ?? b.image ?? [],
        tags: b.tags || [],
        hidden: !!b.hidden,
      })
      return json(res, { ok: true, data: moment }, 201)
    }

    // Bulk actions for moments: { ids, action: 'hide' | 'show' | 'delete' }
    if (p === '/api/moments/bulk' && m === 'POST') {
      if (!checkAuth(req)) return unauthorized(res)
      const b = await readBody(req)
      const ids = normaliseIds(b.ids)
      if (!ids.length) return json(res, { ok: false, error: '请先选择要操作的动态' }, 400)
      if (!['hide', 'show', 'delete'].includes(b.action)) {
        return json(res, { ok: false, error: '不支持的批量操作' }, 400)
      }
      if (b.action === 'delete') {
        if (typeof momentsRepo.deleteMany !== 'function') {
          return json(res, { ok: false, error: '当前存储不支持批量删除' }, 501)
        }
        return json(res, { ok: true, data: await momentsRepo.deleteMany(ids) })
      }
      if (typeof momentsRepo.setHiddenMany !== 'function') {
        return json(res, { ok: false, error: '当前存储不支持批量隐藏' }, 501)
      }
      return json(res, { ok: true, data: await momentsRepo.setHiddenMany(ids, b.action === 'hide') })
    }

    const mid = p.match(/^\/api\/moments\/(\d+)$/)
    if (mid) {
      const id = Number(mid[1])
      if (m === 'GET') {
        const moment = await momentsRepo.getById(id)
        if (!moment || (moment.hidden && !canSeeHidden(req))) {
          return json(res, { ok: false, error: '动态不存在' }, 404)
        }
        return json(res, { ok: true, data: moment })
      }
      if (m === 'PUT') {
        if (!checkAuth(req)) return unauthorized(res)
        const moment = await momentsRepo.update(id, await readBody(req))
        if (!moment) return json(res, { ok: false, error: '动态不存在' }, 404)
        return json(res, { ok: true, data: moment })
      }
      if (m === 'DELETE') {
        if (!checkAuth(req)) return unauthorized(res)
        const r = await momentsRepo.delete(id)
        if (!r) return json(res, { ok: false, error: '动态不存在' }, 404)
        return json(res, { ok: true, data: r })
      }
    }

    /* ── Upload ── */
    if (p === '/api/upload' && m === 'POST') {
      if (!checkAuth(req)) return unauthorized(res)
      const parts = await parseMultipart(req)
      if (!parts.length) return json(res, { ok: false, error: '未选择图片文件' }, 400)

      const files = parts.map(toFile)
      for (const file of files) {
        const err = validateImage(file)
        if (err) return json(res, { ok: false, error: err }, 400)
      }

      const imagesRepo = await getImagesRepo()
      const urls = []
      for (const file of files) {
        const { url } = await imagesRepo.upload(file)
        urls.push(url)
      }
      return json(res, { ok: true, data: { url: urls[0], urls } }, 201)
    }

    return json(res, { ok: false, error: 'Not found' }, 404)
  } catch (e) {
    console.error('API error:', e)
    return json(res, { ok: false, error: e.message || 'Server error' }, 500)
  }
}
