import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', '..', '..', 'public', 'uploads')

export const fileImagesRepo = {
  async upload(file) {
    await mkdir(UPLOAD_DIR, { recursive: true })
    const ext = file.name.split('.').pop() || 'jpg'
    const id = crypto.randomBytes(8).toString('hex')
    const filename = `${id}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)
    await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
    return { url: `/uploads/${filename}` }
  },
}
