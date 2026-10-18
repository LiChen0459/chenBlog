import { api } from './index.js'

const TOKEN_KEY = 'admin_token'

/** The media endpoints are admin-only — attach the stored bearer token. */
function authOpts() {
  try {
    const t = localStorage.getItem(TOKEN_KEY)
    return t ? { token: t } : {}
  } catch { return {} }
}

/**
 * Media library (admin): every uploaded image, each annotated with where it
 * is referenced (posts / moments / pages). Blob storage pages by cursor;
 * the local folder returns everything at once.
 *
 * @param {{ cursor?: string|null, limit?: number }} [opts]
 * @returns {Promise<{ items: Array, cursor: string|null, hasMore: boolean }>}
 */
export async function getMedia({ cursor, limit } = {}) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  if (cursor) params.set('cursor', String(cursor))
  const q = params.toString()
  // getPage keeps the envelope: items live under `data`, paging beside it.
  const env = await api.getPage(`/api/media${q ? `?${q}` : ''}`, authOpts())
  return { items: env.data || [], cursor: env.cursor ?? null, hasMore: !!env.hasMore }
}

/** Permanently remove an image from the store. */
export function deleteMedia(url) {
  return api.del(`/api/media?url=${encodeURIComponent(url)}`, authOpts())
}
