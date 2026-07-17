import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { postsRoutes } from './routes/posts.js'
import { momentsRoutes } from './routes/moments.js'
import { uploadRoutes } from './routes/upload.js'

export function createApp() {
  const app = new Hono().basePath('/api')

  app.use('*', cors())
  app.use('*', logger())

  // Health
  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

  // Routes
  app.route('/posts', postsRoutes)
  app.route('/moments', momentsRoutes)
  app.route('/upload', uploadRoutes)

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

  return app
}
