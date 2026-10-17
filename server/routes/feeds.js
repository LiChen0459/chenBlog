import { Hono } from 'hono'
import { getPostsRepo, getPagesRepo } from '../repositories/index.js'

/**
 * XML feeds + sitemap, served at the site root (/rss.xml, /atom.xml,
 * /sitemap.xml) from LIVE post data — no build step, so a new article shows
 * up in the feed immediately.
 *
 * Mounted by server/index.js (dev / node host) and dispatched from
 * api/index.js (Vercel). Kept separate from createApp() because that app is
 * mounted under the /api basePath while these live at the root.
 */
export function feedApp() {
  const app = new Hono()

  /** Absolute site origin: SITE_URL wins, then the request's own origin. */
  function siteOrigin(c) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
    try { return new URL(c.req.url).origin } catch { return 'http://localhost:5173' }
  }

  function escapeXml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const FEED_LIMIT = 20
  const xml = (c, body, type) => c.body(body, 200, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'public, max-age=300',
  })

  /** Newest N posts (full body, feeds are small by nature). */
  async function latestPosts() {
    const repo = await getPostsRepo()
    return repo.getAll({ limit: FEED_LIMIT })
  }

  /* ── RSS 2.0 ── */
  app.get('/rss.xml', async (c) => {
    const origin = siteOrigin(c)
    const posts = await latestPosts()

    const items = posts.map((p) => {
      const link = `${origin}/blog/${p.id}`
      const cats = [...(p.tags || []), p.category].filter(Boolean)
        .map((t) => `      <category>${escapeXml(t)}</category>`).join('\n')
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(p.summary || p.title)}</description>
${cats}
    </item>`
    }).join('\n')

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chen's Blog</title>
    <link>${escapeXml(origin)}</link>
    <description>记录技术思考，分享生活碎片</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(origin)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

    return xml(c, body, 'application/rss+xml')
  })

  /* ── Atom 1.0 ── */
  app.get('/atom.xml', async (c) => {
    const origin = siteOrigin(c)
    const posts = await latestPosts()
    const updated = posts.length ? new Date(`${posts[0].date}T00:00:00Z`).toISOString() : new Date().toISOString()

    const entries = posts.map((p) => {
      const link = `${origin}/blog/${p.id}`
      const cats = [...(p.tags || []), p.category].filter(Boolean)
        .map((t) => `    <category term="${escapeXml(t)}" />`).join('\n')
      return `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${escapeXml(link)}" rel="alternate" type="text/html" />
    <id>${escapeXml(link)}</id>
    <updated>${new Date(`${p.date}T00:00:00Z`).toISOString()}</updated>
    <summary>${escapeXml(p.summary || p.title)}</summary>
${cats}
  </entry>`
    }).join('\n')

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Chen's Blog</title>
  <link href="${escapeXml(origin)}" rel="alternate" type="text/html" />
  <link href="${escapeXml(origin)}/atom.xml" rel="self" type="application/atom+xml" />
  <id>${escapeXml(origin)}/</id>
  <updated>${updated}</updated>
  <subtitle>记录技术思考，分享生活碎片</subtitle>
${entries}
</feed>`

    return xml(c, body, 'application/atom+xml')
  })

  /* ── Sitemap ── */
  app.get('/sitemap.xml', async (c) => {
    const origin = siteOrigin(c)
    const [repo, pagesRepo] = await Promise.all([getPostsRepo(), getPagesRepo()])
    const [posts, pages, taxonomy] = await Promise.all([
      repo.getAll({ limit: 200 }),
      pagesRepo.getAll(),
      typeof repo.taxonomy === 'function' ? repo.taxonomy() : { categories: [], tags: [] },
    ])

    const url = (loc, lastmod, priority, changefreq = 'weekly') => `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`

    const urls = [
      url(`${origin}/`, null, '1.0', 'daily'),
      url(`${origin}/blog`, null, '0.9', 'daily'),
      url(`${origin}/moments`, null, '0.8', 'daily'),
      url(`${origin}/archive`, null, '0.7'),
      ...pages.map((p) => url(`${origin}/page/${p.slug}`, p.updated_at || null, '0.6')),
      // Top-level category nodes only — children are reachable from them.
      ...taxonomy.categories
        .filter((cat) => !cat.path.includes('/'))
        .map((cat) => url(`${origin}/category/${encodeURIComponent(cat.path)}`, null, '0.5')),
      ...taxonomy.tags.slice(0, 60).map((t) => url(`${origin}/tag/${encodeURIComponent(t.name)}`, null, '0.4')),
      ...posts.map((p) => url(`${origin}/blog/${p.id}`, p.date, p.pinned ? '0.9' : '0.7')),
    ]

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    return xml(c, body, 'application/xml')
  })

  return app
}
