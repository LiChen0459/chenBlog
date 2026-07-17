import { api } from './index.js'

export function getMoments(limit) {
  const q = limit ? `?limit=${limit}` : ''
  return api.get(`/api/moments${q}`)
}
