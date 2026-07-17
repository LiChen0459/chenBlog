const BASE = ''

function token() {
  return localStorage.getItem('admin_token') || ''
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token()}`,
    },
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'API error')
  return json.data
}

export const admin = {
  // Posts
  getPosts: () => request('/api/posts'),
  getPost: (id) => request(`/api/posts/${id}`),
  createPost: (data) =>
    request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updatePost: (id, data) =>
    request(`/api/posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deletePost: (id) =>
    request(`/api/posts/${id}`, { method: 'DELETE' }),
  togglePin: (id) =>
    request(`/api/posts/${id}/pin`, { method: 'PATCH' }),

  // Moments
  getMoments: () => request('/api/moments'),
  createMoment: (data) =>
    request('/api/moments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateMoment: (id, data) =>
    request(`/api/moments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateMoment: (id, data) =>
    request(`/api/moments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteMoment: (id) =>
    request(`/api/moments/${id}`, { method: 'DELETE' }),

  // Upload image
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: form,
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Upload failed')
    return json.data.url
  },
}
