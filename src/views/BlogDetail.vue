<template>
  <div class="detail" v-if="loading">
    <p style="color:var(--text-muted);text-align:center;padding-top:80px;">加载中...</p>
  </div>
  <div class="detail" v-else-if="post">
    <router-link to="/blog" class="back-link">&larr; 返回文章列表</router-link>
    <article>
      <header class="detail-header">
        <time>{{ post.date }}</time>
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
    <router-link to="/blog" class="back-link">&larr; 返回文章列表</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getPost } from '../api/posts.js'
import { blogPosts } from '../data/posts.js'
import { marked } from 'marked'
import katex from 'katex'

marked.setOptions({ breaks: true, gfm: true })

const route = useRoute()
const loading = ref(true)
const post = ref(null)
const bodyRef = ref(null)

const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  let html = marked.parse(post.value.content)
  // Render LaTeX: $$...$$ and $...$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }) }
    catch { return _ }
  })
  html = html.replace(/\$([^\$]+?)\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }) }
    catch { return _ }
  })
  return html
})

async function loadPost() {
  loading.value = true
  try { post.value = await getPost(Number(route.params.id)) } catch { post.value = blogPosts.find(p => p.id === Number(route.params.id)) }
  loading.value = false
  if (post.value) {
    document.title = post.value.title + ' — Chen\'s Blog'
    document.querySelector('meta[name="description"]')?.setAttribute('content', post.value.summary || '')
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.value.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.value.summary || '')
  }
}

onMounted(() => { loadPost() })
watch(() => route.params.id, () => { loadPost() })
</script>
