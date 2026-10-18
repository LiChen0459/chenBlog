import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { postsRoutes } from './routes/posts.js'
import { momentsRoutes } from './routes/moments.js'
import { uploadRoutes } from './routes/upload.js'
import { mediaRoutes } from './routes/media.js'
import { settingsRoutes } from './routes/settings.js'
import { pagesRoutes } from './routes/pages.js'
import { getPostsRepo, getMomentsRepo, getPagesRepo } from './repositories/index.js'
import { makeCaptcha, captchaOk } from './repositories/utils.js'
import { requireAdmin } from './middleware/auth.js'

export function createApp() {
  const app = new Hono().basePath('/api')

  app.use('*', cors())
  app.use('*', logger())

  // Health
  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

  // Verify the admin token — used by the /desk login screen. Gated by a
  // server-signed captcha: the answer is checked here, not in the browser.
  app.get('/auth', (c) => {
    if (!captchaOk(c)) {
      return c.json({ ok: false, error: '人机验证未通过，请重新输入', code: 'CAPTCHA_INVALID' }, 401)
    }
    return requireAdmin(c, () => c.json({ ok: true }))
  })

  // Public: mint a captcha challenge for the login screen.
  app.get('/auth/challenge', (c) => {
    const cap = makeCaptcha()
    if (!cap.token) {
      return c.json({ ok: false, error: 'ADMIN_TOKEN not configured', code: 'SERVER_ERROR' }, 500)
    }
    return c.json({ ok: true, data: cap })
  })

  // Backup: every post + moment + page in one payload.
  app.get('/backup', requireAdmin, async (c) => {
    const [postsRepo, momentsRepo, pagesRepo] = await Promise.all([
      getPostsRepo(),
      getMomentsRepo(),
      getPagesRepo(),
    ])
    const [posts, moments, pages] = await Promise.all([
      postsRepo.getAll({}),
      momentsRepo.getAll({ includeHidden: true }),
      pagesRepo.getAll(),
    ])
    return c.json({
      ok: true,
      data: { exported_at: new Date().toISOString(), posts, moments, pages },
    })
  })

  // Routes
  app.route('/posts', postsRoutes)
  app.route('/moments', momentsRoutes)
  app.route('/upload', uploadRoutes)
  app.route('/media', mediaRoutes)
  app.route('/settings', settingsRoutes)
  app.route('/pages', pagesRoutes)

  // Cross-link to ChenWebsite
  app.get('/crosslink', (c) =>
    c.json({
      ok: true,
      data: {
        name: "Chen's Portfolio",
        url: process.env.CHENWEBSITE_URL || 'https://your-website.vercel.app',
        label: 'View Portfolio',
        description: 'Full-stack developer portfolio',
      },
    })
  )

  app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404))

  return app
}
