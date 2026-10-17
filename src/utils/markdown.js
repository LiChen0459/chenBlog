import { marked } from 'marked'
import katex from 'katex'

marked.setOptions({ breaks: true, gfm: true })

/** Render LaTeX without touching code blocks / inline code / ordinary dollar signs. */
function renderMath(html) {
  // 1. Protect code regions so `$` inside them is never treated as math.
  const codeChunks = []
  const protectedHtml = html.replace(/<(pre|code)\b[\s\S]*?<\/\1>/gi, (match) => {
    codeChunks.push(match)
    return `\u0000CODE${codeChunks.length - 1}\u0000`
  })

  // 2. Block math: $$ ... $$
  let out = protectedHtml.replace(/\$\$([\s\S]+?)\$\$/g, (raw, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }) }
    catch { return raw }
  })

  // 3. Inline math: $...$ — only when it actually looks like LaTeX, so "$100" stays untouched.
  out = out.replace(/\$([^\n$]+?)\$/g, (raw, tex) => {
    if (!/\\[a-zA-Z]|[\^_{}=]/.test(tex)) return raw
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }) }
    catch { return raw }
  })

  // 4. Restore the protected code regions.
  return out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeChunks[Number(i)])
}

/** Markdown source → sanitised-by-construction HTML with KaTeX support. */
export function renderMarkdown(md) {
  if (!md) return ''
  return renderMath(marked.parse(md))
}

/** Turn a heading's text into a URL-safe id (keeps CJK + alphanumerics). */
export function slugify(text) {
  const base = text.trim().toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}
