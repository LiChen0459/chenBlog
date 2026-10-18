import { marked, Renderer } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js/lib/common'

marked.setOptions({ breaks: true, gfm: true })

/** Human label for a fence's info string ("cpp" → "C++"). */
const LANG_NAMES = {
  js: 'JavaScript', javascript: 'JavaScript', mjs: 'JavaScript', jsx: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', python: 'Python',
  cpp: 'C++', cc: 'C++', c: 'C', h: 'C',
  cs: 'C#', csharp: 'C#',
  java: 'Java', go: 'Go', golang: 'Go', rust: 'Rust', rs: 'Rust',
  php: 'PHP', ruby: 'Ruby', rb: 'Ruby', swift: 'Swift', kotlin: 'Kotlin', kt: 'Kotlin',
  scala: 'Scala', lua: 'Lua', r: 'R', dart: 'Dart', perl: 'Perl',
  sh: 'Shell', bash: 'Bash', zsh: 'Shell', shell: 'Shell',
  ps1: 'PowerShell', powershell: 'PowerShell',
  json: 'JSON', yml: 'YAML', yaml: 'YAML', toml: 'TOML', ini: 'INI',
  html: 'HTML', xml: 'XML', svg: 'SVG', css: 'CSS', scss: 'SCSS', less: 'Less',
  vue: 'Vue', svelte: 'Svelte',
  sql: 'SQL', graphql: 'GraphQL',
  dockerfile: 'Dockerfile', makefile: 'Makefile', diff: 'Diff', patch: 'Diff',
  markdown: 'Markdown', md: 'Markdown',
  plaintext: '纯文本', text: '纯文本', txt: '纯文本',
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** highlight.js; unknown/missing languages fall back to escaped plain text. */
function highlightCode(code, lang) {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    }
    if (!lang) return hljs.highlightAuto(code).value
  } catch { /* unknown grammar — plain text below */ }
  return escapeHtml(code)
}

/**
 * Split highlighted HTML into one span per source line for the gutter.
 * highlight.js emits spans that can cross newlines (multi-line comments,
 * template strings), so open tags are tracked and re-opened on every line —
 * otherwise each line after a multi-line span would lose its highlighting.
 * The full opening tag (with class attributes) is kept, not just the name.
 */
function wrapLines(html) {
  const out = []
  const open = [] // { name, tag } — name for matching the close, tag to re-open
  let line = ''

  const flush = () => {
    const head = open.map((o) => o.tag).join('')
    const tail = open.slice().reverse().map((o) => `</${o.name}>`).join('')
    out.push(head + line + tail)
    line = ''
  }
  const emit = (text) => {
    const parts = text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) flush()
      line += parts[i]
    }
  }

  const tagRe = /<(\/?)([a-zA-Z][\w-]*)[^>]*>/g
  let last = 0
  let m
  while ((m = tagRe.exec(html)) !== null) {
    emit(html.slice(last, m.index))
    const [full, slash, name] = m
    if (slash) {
      const idx = open.map((o) => o.name).lastIndexOf(name)
      if (idx >= 0) open.splice(idx, 1)
    } else if (!full.endsWith('/>')) {
      open.push({ name, tag: full })
    }
    line += full
    last = tagRe.lastIndex
  }
  emit(html.slice(last))
  flush()
  return out
}

/**
 * Fenced code → syntax-highlighted block with a gutter, language label and a
 * copy button (wired by utils/codeCopy.js via delegation, because the HTML
 * arrives through v-html).
 */
const renderer = new Renderer()
renderer.code = ({ text, lang }) => {
  const key = String(lang || '').trim().toLowerCase().split(/\s+/)[0]
  const label = (key && LANG_NAMES[key]) || (key ? key.toUpperCase() : '代码')
  const lines = wrapLines(highlightCode(text.replace(/\n$/, ''), key))
  const body = lines.map((l) => `<span class="code-line">${l}</span>`).join('\n')
  return [
    '<div class="code-block">',
    '<div class="code-block-bar">',
    `<span class="code-block-lang">${escapeHtml(label)}</span>`,
    '<button class="code-copy" type="button">复制</button>',
    '</div>',
    `<pre><code class="hljs">${body}</code></pre>`,
    '</div>',
  ].join('')
}
marked.use({ renderer })

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
    try { return katex.renderToString(tex.trim(), { throwOnError: false }) }
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
