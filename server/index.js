import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { storageMode } from './repositories/index.js'

const app = createApp()
const port = process.env.PORT || 3001

console.log(`  API  → http://localhost:${port}`)

if (storageMode() === 'postgres') {
  console.log('  存储 → Neon Postgres（检测到 DATABASE_URL）')
  console.log('  注意 → 这会直接读写线上数据库。想改用本地 JSON 存储请执行：')
  console.log('         npm run dev:server:local')
} else {
  console.log('  存储 → 本地 JSON（server/data/）+ public/uploads/')
}

console.log('  提示 → 前端单独跑 npm run dev 时本进程要一直开着，')
console.log('         或者直接用 npm run dev:all 同时启动前后端。')
console.log('')

serve({ fetch: app.fetch, port })
