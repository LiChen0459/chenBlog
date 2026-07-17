import { serve } from '@hono/node-server'
import { createApp } from './app.js'

const app = createApp()
const port = process.env.PORT || 3001

console.log(`  ⚡ API server running at http://localhost:${port}`)
serve({ fetch: app.fetch, port })
