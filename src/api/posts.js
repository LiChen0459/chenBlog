import { api } from './index.js'

/**
 * List posts — returns the LEAN projection (no full markdown body) plus
 * pagination metadata, so a large archive never ships every article at once.
 *
 * @param {{ limit?: number, offset?: number }} [opts]
 * @returns {Promise<{ items: Array, total: number, hasMore: boolean, offset: number }>}
 */
export async function getPosts({ limit, offset } = {}) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit)
  if (offset) params.set('offset', offset)
  const q = params.toString()

  const { data, total, hasMore, offset: off } = await api.getPage(`/api/posts${q ? `?${q}` : ''}`)
  return { items: data || [], total: total ?? (data || []).length, hasMore: !!hasMore, offset: off ?? 0 }
}

/** Full post, including the markdown body. */
export function getPost(id) {
  return api.get(`/api/posts/${id}`)
}
