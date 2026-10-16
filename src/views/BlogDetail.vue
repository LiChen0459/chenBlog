<template>
  <div class="detail" v-if="loading">
    <p style="color:var(--text-muted);text-align:center;padding-top:80px;">加载中...</p>
  </div>
  <div class="detail" v-else-if="post">
    <router-link to="/blog" class="back-link">
      <Icon name="arrow-left" :size="14" />
      返回文章列表
    </router-link>
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
      <div class="detail-body" v-html="renderedContent"></div>
    </article>
  </div>
  <div class="detail not-found" v-else>
    <p>文章不存在。</p>
    <router-link to="/blog" class="back-link">
      <Icon name="arrow-left" :size="14" />
      返回文章列表
    </router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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

async function loadPost() {
  loading.value = true
  const id = Number(route.params.id)
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
  }
}

onMounted(() => { loadPost() })
watch(() => route.params.id, () => { loadPost() })
onBeforeUnmount(() => { document.title = "Chen's Blog — 记录技术思考，分享生活碎片" })
</script>
