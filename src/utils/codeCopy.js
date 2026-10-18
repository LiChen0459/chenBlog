/**
 * One-click copy for rendered code blocks. The markdown arrives via v-html,
 * so no per-element listeners are possible — one delegated handler on the
 * container covers every block and survives re-renders.
 *
 * Returns an unbind function; call it when the container goes away.
 */
export function bindCodeCopy(root) {
  if (!root) return () => {}

  const onClick = async (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.code-copy') : null
    if (!btn || !root.contains(btn)) return
    const code = btn.closest('.code-block')?.querySelector('code')
    if (!code) return
    // Line spans carry no newline characters of their own (CSS display:block
    // draws them), so rejoin the DOM text with real newlines.
    const text = [...code.querySelectorAll('.code-line')].map((l) => l.textContent).join('\n')
    if (!text.trim()) return

    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { ok = document.execCommand('copy') } catch { ok = false }
      ta.remove()
    }
    if (!ok) return

    btn.textContent = '已复制'
    btn.classList.add('copied')
    clearTimeout(btn._copyTimer)
    btn._copyTimer = setTimeout(() => {
      btn.textContent = '复制'
      btn.classList.remove('copied')
    }, 2000)
  }

  root.addEventListener('click', onClick)
  return () => root.removeEventListener('click', onClick)
}
