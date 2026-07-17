import { api } from './index.js'

export function getPosts(limit) {
  const q = limit ? `?limit=${limit}` : ''
  return api.get(`/api/posts${q}`)
}

export function getPost(id) {
  return api.get(`/api/posts/${id}`)
}
