import { put, list, del } from '@vercel/blob'
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

  /**
   * Every blob in the store, newest first (the SDK's default ordering).
   * `cursor` continues a previous page; both are returned for the next call.
   */
  async list({ cursor, limit = 100 } = {}) {
    const res = await list({
      limit: Math.min(Math.max(Number(limit) || 100, 1), 500),
      ...(cursor ? { cursor } : {}),
    })
    return {
      items: (res.blobs || []).map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
      cursor: res.cursor ?? null,
      hasMore: !!res.hasMore,
    }
  },

  async remove(url) {
    if (!/^https?:\/\//.test(String(url || ''))) {
      throw new Error('非法的图片地址')
    }
    await del(url)
    return { deleted: url }
  },
}
