/**
 * Category paths are slash-separated ("技术/前端"). Values typed into the
 * admin form can pick up stray slashes ("信息学奥赛/"), which used to leak
 * straight into the chip text and the category link. Everything that shows
 * or links a category goes through here.
 */

/** "信息学奥赛/" → "信息学奥赛"; also collapses "//" and trims each segment. */
export function normCategory(cat) {
  return String(cat || '')
    .trim()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/')
}

/** Router link for a category path; falls back to the article list. */
export function categoryLink(cat) {
  const path = normCategory(cat)
  if (!path) return '/blog'
  return `/category/${path.split('/').map(encodeURIComponent).join('/')}`
}
