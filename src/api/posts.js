import { api } from './index.js'

/**
 * List posts — returns the LEAN projection (no full markdown body) plus
 * pagination metadata, so a large archive never ships every article at once.
 *
 * @param {{ limit?: number, offset?: number, category?: string, tag?: string, year?: string|number }} [opts]
 *   `category` — exact category path, e.g. "技术/前端"
 *   `tag`      — single tag name
 *   `year`     — four-digit year, e.g. 2025
 * @returns {Promise<{ items: Array, total: number, hasMore: boolean, offset: number }>}
 */
export async function getPosts({ limit, offset, category, tag, year } = {}) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit)
  if (offset) params.set('offset', offset)
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (year) params.set('year', year)
  const q = params.toString()

  const { data, total, hasMore, offset: off } = await api.getPage(`/api/posts${q ? `?${q}` : ''}`)
  return { items: data || [], total: total ?? (data || []).length, hasMore: !!hasMore, offset: off ?? 0 }
}

/** Full post, including the markdown body. */
export function getPost(id) {
  return api.get(`/api/posts/${id}`)
}

/**
 * Category tree + tag cloud (both with counts). Categories are flat nodes
 * whose `path` may be hierarchical ("技术/前端"); build the tree by
 * splitting on "/".
 */
export function getTaxonomy() {
  return api.get('/api/posts/taxonomy')
}

/**
 * Full-text search over titles / summaries / bodies.
 * @param {string} q keyword
 * @param {number} [limit] max results (server caps at 50)
 */
export async function searchPosts(q, limit = 20) {
  const { data, total } = await api.getPage(`/api/posts/search?q=${encodeURIComponent(q)}&limit=${limit}`)
  return { items: data || [], total: total ?? (data || []).length }
}
