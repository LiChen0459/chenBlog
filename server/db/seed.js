/**
 * Seed the local JSON data files from src/data/posts.js
 * Run: node server/db/seed.js
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcFile = pathToFileURL(join(__dirname, '..', '..', 'src', 'data', 'posts.js')).href

const { blogPosts, moments } = await import(srcFile)

const DATA_DIR = join(__dirname, '..', 'data')
await mkdir(DATA_DIR, { recursive: true })
await writeFile(join(DATA_DIR, 'posts.json'), JSON.stringify(blogPosts, null, 2), 'utf-8')
await writeFile(join(DATA_DIR, 'moments.json'), JSON.stringify(moments, null, 2), 'utf-8')

console.log(`  ✅ Seeded ${blogPosts.length} posts + ${moments.length} moments → server/data/`)
