import { api } from './index.js'

/** Every standalone page (关于我 / 友情链接 / …), content included. */
export function getPages() {
  return api.get('/api/pages')
}

/** One page by its URL slug, e.g. "about". */
export function getPage(slug) {
  return api.get(`/api/pages/${encodeURIComponent(slug)}`)
}
