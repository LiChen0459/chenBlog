import { api } from './index.js'

const LIMIT = 50

/**
 * Guestbook messages, newest first. Hidden messages never reach anonymous
 * callers (the server filters them out).
 */
export async function getMessages({ limit = LIMIT, offset } = {}) {
  const params = new URLSearchParams()
  params.set('limit', limit)
  if (offset) params.set('offset', offset)
  const { data, total, hasMore, offset: off } = await api.getPage(`/api/messages?${params}`)
  return { items: data || [], total: total ?? (data || []).length, hasMore: !!hasMore, offset: off ?? 0 }
}

/**
 * Post a guestbook message. `website` is a honeypot that must stay empty —
 * the server silently drops submissions that fill it.
 */
export function postMessage({ nickname, content, website }) {
  return api.post('/api/messages', { nickname, content, website })
}
