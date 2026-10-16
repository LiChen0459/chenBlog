import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { postsRoutes } from './routes/posts.js'
import { momentsRoutes } from './routes/moments.js'
import { uploadRoutes } from './routes/upload.js'
import { settingsRoutes } from './routes/settings.js'
import { getPostsRepo, getMomentsRepo } from './repositories/index.js'
import { requireAdmin } from './middleware/auth.js'

export function createApp() {
  const app = new Hono().basePath('/api')

  app.use('*', cors())
  app.use('*', logger())

  // Health
  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

  // Verify the admin token — used by the /desk login screen.
  app.get('/auth', requireAdmin, (c) => c.json({ ok: true }))

  // Backup: every post + moment in one payload.
  app.get('/backup', requireAdmin, async (c) => {
    const [postsRepo, momentsRepo] = await Promise.all([getPostsRepo(), getMomentsRepo()])
    const [posts, moments] = await Promise.all([
      postsRepo.getAll({}),
      momentsRepo.getAll({ includeHidden: true }),
    ])
    return c.json({
      ok: true,
      data: { exported_at: new Date().toISOString(), posts, moments },
    })
  })

  // Routes
  app.route('/posts', postsRoutes)
  app.route('/moments', momentsRoutes)
  app.route('/upload', uploadRoutes)
  app.route('/settings', settingsRoutes)

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
