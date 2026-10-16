import { api } from './index.js'

/**
 * @param {number} [limit]
 * @param {string} [unlockToken] scoped token — reveals hidden moments when valid.
 */
export function getMoments(limit, unlockToken) {
  const q = limit ? `?limit=${limit}` : ''
  return api.get(`/api/moments${q}`, { unlockToken })
}

/** Public: number of currently hidden moments (drives the unlock affordance). */
export async function getHiddenMomentCount() {
  const data = await api.get('/api/moments/hidden-count')
  return Number(data?.count) || 0
}

/**
 * Exchange the moments password for a scoped, expiring unlock token.
 * Throws with `err.status === 401` when the password is wrong.
 */
export function unlockMoments(password) {
  return api.post('/api/moments/unlock', { password })
}
