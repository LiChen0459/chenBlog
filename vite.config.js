import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

const DEFAULT_API_TARGET = 'http://localhost:3001'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const blogUrl = env.VITE_BLOG_URL || 'https://your-blog.vercel.app'
  // Allow pointing the dev proxy at a non-default API port (e.g. when 3001 is taken).
  const API_TARGET = env.VITE_API_TARGET || DEFAULT_API_TARGET
  const API_DOWN_HINT =
    '后端 API 未启动（' + API_TARGET + '）。请另开一个终端运行 npm run dev:server，或直接用 npm run dev:all 同时启动前后端。'

  return {
    plugins: [
      vue(),
      {
        name: 'replace-public-env',
        closeBundle() {
          // Replace domain placeholder in public text files after build
          const files = ['robots.txt', 'sitemap.xml']
          for (const file of files) {
            const filePath = path.resolve('dist', file)
            if (fs.existsSync(filePath)) {
              let content = fs.readFileSync(filePath, 'utf-8')
              content = content.replace(/https:\/\/your-blog\.vercel\.app/g, blogUrl)
              fs.writeFileSync(filePath, content)
            }
          }
        },
      },
      {
        // Warn once at startup when the API server is not running, instead of
        // letting every /api request fail with a bare ECONNREFUSED stack.
        name: 'api-server-hint',
        apply: 'serve',
        configureServer(server) {
          const check = async () => {
            try {
              const res = await fetch(`${API_TARGET}/api/health`, { signal: AbortSignal.timeout(1500) })
              if (!res.ok) throw new Error('unhealthy')
            } catch {
              console.log('')
              console.log('  \x1b[33m⚠️  ' + API_DOWN_HINT + '\x1b[0m')
              console.log('  \x1b[2m   未启动后端时：前台会回落到内置示例数据，后台登录不可用。\x1b[0m')
              console.log('')
            }
          }
          // Give a concurrently-started API server a moment to come up.
          server.httpServer?.once('listening', () => setTimeout(check, 1200))
        },
      },
    ],
    server: {
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          configure(proxy) {
            let warned = false
            proxy.on('error', (err, req, res) => {
              if (!warned) {
                warned = true
                console.log('  \x1b[33m⚠️  ' + API_DOWN_HINT + '\x1b[0m')
              }
              // Answer with JSON so the frontend can surface a readable message
              // instead of choking on an empty 500 response.
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(JSON.stringify({ ok: false, error: API_DOWN_HINT, code: 'API_DOWN' }))
              } else if (res && typeof res.destroy === 'function') {
                res.destroy()
              }
            })
          },
        },
      },
    },
  }
})
