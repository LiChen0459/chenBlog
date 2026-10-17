<template>
  <div class="detail" v-if="loading">
    <p style="color:var(--text-muted);text-align:center;padding-top:80px;">加载中...</p>
  </div>
  <div class="detail" v-else-if="post">
    <router-link to="/blog" class="back-link">
      <Icon name="arrow-left" :size="14" />
      返回文章列表
    </router-link>
    <div class="detail-layout">
      <article>
        <header class="detail-header">
          <div class="detail-meta">
            <time>{{ post.date }}</time>
            <span v-if="post.pinned" class="badge-pin">
              <Icon name="bookmark" :size="11" fill="currentColor" />
              置顶
            </span>
          </div>
          <h1>{{ post.title }}</h1>
          <div class="tag-pills" v-if="post.tags?.length">
            <span class="tag-pill" v-for="t in post.tags" :key="t">{{ t }}</span>
          </div>
        </header>
        <div class="section-line">
          <div class="section-line-inner"></div>
        </div>
        <div class="detail-body" v-html="renderedContent" ref="bodyRef"></div>
      </article>

      <aside class="outline" v-if="outline.length >= 2" aria-label="文章大纲">
        <p class="outline-title">大纲</p>
        <ul class="outline-list">
          <li v-for="item in outline" :key="item.id"
              class="outline-item" :class="`outline-item--h${item.level}`">
            <a class="outline-link" :class="{ 'is-active': item.id === activeId }"
               @click.prevent="scrollToHeading(item.id)">{{ item.text }}</a>
          </li>
        </ul>
      </aside>
    </div>
  </div>
  <div class="detail not-found" v-else>
    <p>文章不存在。</p>
    <router-link to="/blog" class="back-link">
      <Icon name="arrow-left" :size="14" />
      返回文章列表
    </router-link>
  </div>

  <!-- Narrow screens: floating button + bottom-sheet drawer -->
  <button v-if="post && outline.length >= 2" class="outline-fab" @click="outlineOpen = true" aria-label="打开文章大纲">
    <Icon name="list" :size="16" />
    大纲
  </button>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="outlineOpen" class="outline-backdrop" @click="outlineOpen = false"></div>
    </Transition>
    <Transition name="drawer">
      <aside v-if="outlineOpen && outline.length" class="outline-drawer" aria-label="文章大纲">
        <div class="outline-drawer-header">
          <span class="outline-drawer-title">大纲</span>
          <button class="outline-drawer-close" @click="outlineOpen = false" aria-label="关闭">
            <Icon name="x" :size="18" />
          </button>
        </div>
        <ul class="outline-list">
          <li v-for="item in outline" :key="item.id"
              class="outline-item" :class="`outline-item--h${item.level}`">
            <a class="outline-link" :class="{ 'is-active': item.id === activeId }"
               @click.prevent="scrollToHeading(item.id)">{{ item.text }}</a>
          </li>
        </ul>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { getPost } from '../api/posts.js'
import { blogPosts } from '../data/posts.js'
import { marked } from 'marked'
import katex from 'katex'

marked.setOptions({ breaks: true, gfm: true })

const route = useRoute()
const loading = ref(true)
const post = ref(null)
const bodyRef = ref(null)
const outline = ref([])
const activeId = ref('')
const outlineOpen = ref(false)

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

const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  return renderMath(marked.parse(post.value.content))
})

/** Turn a heading's text into a URL-safe id (keeps CJK + alphanumerics). */
function slugify(text) {
  const base = text.trim().toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}

/** Walk the rendered article, assign ids to h2/h3 and build the outline list. */
function buildOutline() {
  const root = bodyRef.value
  if (!root) { outline.value = []; return }
  const heads = root.querySelectorAll('h2, h3')
  const seen = {}
  const items = []
  heads.forEach((el, i) => {
    const text = (el.textContent || '').trim() || `小节 ${i + 1}`
    let id = slugify(text)
    if (seen[id]) { seen[id] += 1; id = `${id}-${seen[id]}` }
    else seen[id] = 1
    el.id = id
    items.push({ id, text, level: Number(el.tagName.slice(1)) })
  })
  outline.value = items
  onScroll()
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  outlineOpen.value = false
}

let rafPending = false
function onScroll() {
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    const items = outline.value
    if (!items.length) { activeId.value = ''; return }
    const offset = 100
    let current = items[0].id
    for (const it of items) {
      const el = document.getElementById(it.id)
      if (el && el.getBoundingClientRect().top - offset <= 0) current = it.id
      else break
    }
    activeId.value = current
  })
}

function postId() {
  const n = Number(route.params.id)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function loadPost() {
  const id = postId()
  if (id === null) {
    post.value = null
    loading.value = false
    outline.value = []
    return
  }
  loading.value = true
  try {
    post.value = await getPost(id)
  } catch {
    post.value = blogPosts.find(p => p.id === id) || null
  }
  loading.value = false
  if (post.value) {
    document.title = post.value.title + " — Chen's Blog"
    document.querySelector('meta[name="description"]')?.setAttribute('content', post.value.summary || '')
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.value.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.value.summary || '')
    await nextTick()
    buildOutline()
  } else {
    outline.value = []
  }
}

function addScrollListeners() {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
}
function removeScrollListeners() {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
}

onMounted(() => {
  loadPost()
  addScrollListeners()
})
onActivated(() => {
  // Returning to a cached detail page: restore its title, listeners and highlight.
  addScrollListeners()
  if (post.value) document.title = post.value.title + " — Chen's Blog"
  onScroll()
})
onDeactivated(() => { removeScrollListeners() })
watch(() => route.params.id, () => {
  // Leaving the detail route (:id gone) must NOT fetch — under <keep-alive> this
  // watcher still fires and used to send GET /api/posts/NaN → Neon 500.
  if (postId() !== null) loadPost()
})
onBeforeUnmount(() => {
  removeScrollListeners()
  document.title = "Chen's Blog — 记录技术思考，分享生活碎片"
})
</script>
