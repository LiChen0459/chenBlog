import { put } from '@vercel/blob'

export const vercelImagesRepo = {
  async upload(file) {
    const ext = file.name.split('.').pop() || 'jpg'
    const { url } = await put(`moments/${Date.now()}.${ext}`, file, {
      access: 'public',
    })
    return { url }
  },
}
