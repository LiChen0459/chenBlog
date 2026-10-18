const BASE = '' // Vite proxy handles /api in dev; same origin in prod

async function request(path, { method = 'GET', body, token, unlockToken } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (unlockToken) headers['X-Moments-Unlock'] = unlockToken

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('网络请求失败')
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(`服务器返回异常（HTTP ${res.status}）`)
  }

  if (!json.ok) {
    const err = new Error(json.error || `请求失败（HTTP ${res.status}）`)
    err.status = res.status
    err.code = json.code
    throw err
  }
  return json
}

/**
 * @param {string} path
 * @param {{ token?: string, unlockToken?: string }} [opts]
 *   `token`        — full admin token (never persisted here)
 *   `unlockToken`  — scoped moments-unlock token from POST /api/moments/unlock
 */
export const api = {
  /** Just the payload. */
  get: async (path, opts) => (await request(path, opts)).data,
  /** The whole envelope, including `total` / `hasMore` pagination metadata. */
  getPage: (path, opts) => request(path, opts),
  post: async (path, body, opts) => (await request(path, { ...opts, method: 'POST', body })).data,
  del: async (path, opts) => (await request(path, { ...opts, method: 'DELETE' })).data,
}
