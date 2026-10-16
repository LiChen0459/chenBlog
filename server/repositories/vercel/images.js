import { put } from '@vercel/blob'
import { safeExt } from '../utils.js'

export const vercelImagesRepo = {
  async upload(file) {
    const ext = safeExt(file)
    const name = `moments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { url } = await put(name, file, {
      access: 'public',
      contentType: file.type || undefined,
    })
    return { url }
  },
}
