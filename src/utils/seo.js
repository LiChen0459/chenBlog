/**
 * Per-route <head> management for the SPA.
 *
 * The app is a client-rendered Vue SPA, so crawlers and social scrapers that
 * execute JavaScript (Google, Bing, …) see whatever this module writes into
 * the document head. index.html carries the site-wide defaults; every public
 * view calls setSeo() with its own title / description / canonical URL, and
 * BlogDetail additionally attaches BlogPosting structured data.
 *
 * SITE prefers the build-time VITE_BLOG_URL so canonicals are absolute and
 * correct on the real domain, falling back to the current origin in dev.
 */
const SITE_NAME = "Chen's Blog"
const SITE_DESC = '记录技术思考，分享生活碎片。不追逐热点，只写自己的节奏。'

const SITE = (
  (import.meta.env.VITE_BLOG_URL || '').replace(/\/+$/, '') ||
  (typeof location !== 'undefined' ? location.origin : '')
).replace(/\/+$/, '')

const JSON_LD_ID = 'seo-jsonld'

function upsertMeta(attr, key, content) {
  const selector = `meta[${attr}="${CSS.escape(key)}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * @param {object}  opts
 * @param {string}  [opts.title]        page title; the site suffix is appended
 * @param {string}  [opts.description]  meta description (also og/twitter)
 * @param {string}  [opts.path]         route path for the canonical URL
 * @param {string}  [opts.type]         og:type — 'website' or 'article'
 * @param {object}  [opts.jsonLd]       schema.org object, injected as JSON-LD
 * @param {boolean} [opts.noindex]      true for search/result pages
 */
export function setSeo({
  title = '',
  description = '',
  path = '/',
  type = 'website',
  jsonLd = null,
  noindex = false,
} = {}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — ${SITE_DESC}`
  const desc = description || SITE_DESC

  document.title = fullTitle
  upsertMeta('name', 'description', desc)
  upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')
  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:url', SITE + path)
  upsertMeta('property', 'og:type', type)
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', desc)
  upsertLink('canonical', SITE + path)

  document.getElementById(JSON_LD_ID)?.remove()
  if (jsonLd) {
    const s = document.createElement('script')
    s.id = JSON_LD_ID
    s.type = 'application/ld+json'
    s.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(s)
  }
}

/** BlogPosting structured data for one article. */
export function articleJsonLd(post, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary || post.title,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + path },
    author: { '@type': 'Person', name: 'Chen' },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }
}

/** Rough plain-text preview of a markdown body, for standalone-page meta. */
export function textPreview(markdown, max = 120) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`~\-!|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
