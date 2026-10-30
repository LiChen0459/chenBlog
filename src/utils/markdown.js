let rendererPromise
let parsedRendererCurrent

/** Load the heavier article renderer only when a markdown page is opened. */
export function loadMarkdownRenderer() {
  if (!rendererPromise) rendererPromise = Promise.all([
    import('marked'),
    import('katex'),
    import('highlight.js/lib/common'),
  ]).then(([markedModule, katexModule, hljsModule]) => {
    parsedRendererCurrent = createRenderer(
      markedModule.marked,
      markedModule.Renderer,
      katexModule.default,
      hljsModule.default,
    )
    return parsedRendererCurrent
  })
  return rendererPromise
}

function createRenderer(marked, Renderer, katex, hljs) {

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

/**
 * Highlight each source line independently so multi-line tokens cannot create
 * malformed nested spans when line numbers are added.
 */
function highlightLines(code, lang) {
  return code.split('\n').map((line) => {
    if (!line) return ''
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(line, { language: lang, ignoreIllegals: true }).value
      }
      if (!lang) return hljs.highlightAuto(line).value
    } catch { /* unknown grammar — plain text below */ }
    return escapeHtml(line)
  })
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
  const lines = highlightLines(text.replace(/\n+$/, ''), key)
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

return (md) => renderMath(marked.parse(md))
}

/** Markdown source → rendered HTML with KaTeX support. */
export function renderMarkdown(md) {
  if (!md || !parsedRendererCurrent) return ''
  return parsedRendererCurrent(md)
}

/** Turn a heading's text into a URL-safe id (keeps CJK + alphanumerics). */
export function slugify(text) {
  const base = text.trim().toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}
