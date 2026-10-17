const BASE = '' // Vite proxy handles /api in dev; same origin in prod

function token() {
  return localStorage.getItem('admin_token') || ''
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token()}` },
    })
  } catch {
    throw new Error('网络请求失败，请检查网络或后端服务')
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`服务器返回异常（HTTP ${res.status}）`)
  }

  if (!json.ok) throw new Error(json.error || `请求失败（HTTP ${res.status}）`)
  return json.data
}

const jsonHeaders = { 'Content-Type': 'application/json' }

/** Upload one or many images in a single request. Returns an array of URLs. */
export async function uploadImages(files) {
  const list = Array.from(files || []).filter(Boolean)
  if (!list.length) return []

  const form = new FormData()
  for (const file of list) form.append('images', file)

  let res
  try {
    res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: form,
    })
  } catch {
    throw new Error('图片上传失败，请检查网络')
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`图片上传失败（HTTP ${res.status}）`)
  }

  if (!json.ok) throw new Error(json.error || '图片上传失败')
  return json.data.urls?.length ? json.data.urls : [json.data.url]
}

export const admin = {
  /** Verify the stored token against the server. */
  verify: () => request('/api/auth'),

  // Posts
  getPosts: () => request('/api/posts'),
  getPost: (id) => request(`/api/posts/${id}`),
  createPost: (data) =>
    request('/api/posts', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }),
  updatePost: (id, data) =>
    request(`/api/posts/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }),
  deletePost: (id) =>
    request(`/api/posts/${id}`, { method: 'DELETE' }),
  togglePin: (id) =>
    request(`/api/posts/${id}/pin`, { method: 'PATCH' }),
  /** Batch action over many posts. `action` is 'pin' | 'unpin' | 'delete'. */
  bulkPosts: (ids, action) =>
    request('/api/posts/bulk', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ ids, action }),
    }),

  // Moments
  getMoments: () => request('/api/moments'),
  createMoment: (data) =>
    request('/api/moments', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }),
  updateMoment: (id, data) =>
    request(`/api/moments/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }),
  setMomentHidden: (id, hidden) =>
    request(`/api/moments/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ hidden }) }),
  deleteMoment: (id) =>
    request(`/api/moments/${id}`, { method: 'DELETE' }),
  /** Batch action over many moments. `action` is 'hide' | 'show' | 'delete'. */
  bulkMoments: (ids, action) =>
    request('/api/moments/bulk', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ ids, action }),
    }),

  // Standalone pages (关于我 / 友情链接 / …)
  getPages: () => request('/api/pages'),
  createPage: (data) =>
    request('/api/pages', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(data) }),
  updatePage: (slug, data) =>
    request(`/api/pages/${encodeURIComponent(slug)}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(data) }),
  deletePage: (slug) =>
    request(`/api/pages/${encodeURIComponent(slug)}`, { method: 'DELETE' }),

  // Guestbook
  // Hidden messages come back automatically: `request` attaches the admin token.
  getMessages: () => request('/api/messages?limit=200'),
  setMessageHidden: (id, hidden) =>
    request(`/api/messages/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ hidden }) }),
  deleteMessage: (id) =>
    request(`/api/messages/${id}`, { method: 'DELETE' }),

  // Taxonomy (categories + tags), used by the post editor's category suggestions
  getTaxonomy: () => request('/api/posts/taxonomy'),

  // Settings
  getMomentsPassword: () => request('/api/settings/moments-password'),
  setMomentsPassword: (password) =>
    request('/api/settings/moments-password', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ password }),
    }),

  // Upload
  uploadImages,
  uploadImage: async (file) => (await uploadImages([file]))[0],
}
