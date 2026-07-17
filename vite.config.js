import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const blogUrl = env.VITE_BLOG_URL || 'https://your-blog.vercel.app'

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
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
