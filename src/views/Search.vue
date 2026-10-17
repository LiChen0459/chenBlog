<template>
  <div class="search-page">
    <span class="section-tag">&lt;search&gt;</span>
    <div class="section-head">
      <h2>搜索</h2>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <form class="search-box" role="search" @submit.prevent="runSearch">
      <Icon name="search" :size="16" class="search-box-icon" />
      <input
        v-model="query"
        type="search"
        class="search-input"
        placeholder="搜索标题、摘要或正文…"
        aria-label="搜索文章"
        @input="onInput"
      />
      <button v-if="query" type="button" class="search-clear" aria-label="清空" @click="clearSearch">
        <Icon name="x" :size="14" />
      </button>
    </form>

    <div v-if="searching" class="sk-loading" aria-hidden="true">
      <div class="sk-line w30" />
      <div class="sk-line w90" />
      <div class="sk-line w70" />
      <div class="sk-line w80" />
    </div>

    <template v-else-if="searched">
      <p v-if="errorMsg" class="search-error">
        <Icon name="alert-circle" :size="14" />
        {{ errorMsg }}
      </p>
      <p v-else-if="!items.length" class="search-hint">
        没有找到与「{{ query }}」相关的文章，换个关键词试试？
      </p>
      <p v-else-if="items.length" class="search-hint">
        找到 {{ total }} 篇与「{{ query }}」相关的文章
      </p>

      <div v-if="items.length" class="search-results">
        <router-link v-for="post in items" :key="post.id" class="search-result animate-card" :to="`/blog/${post.id}`">
          <div class="search-result-meta">
            <time>{{ post.date }}</time>
            <span v-if="post.category" class="search-result-cat">{{ post.category }}</span>
          </div>
          <h3 v-html="highlight(post.title, query)"></h3>
          <p class="search-result-summary" v-html="highlight(post.summary, query)"></p>
          <p v-if="snippet(post)" class="search-result-snippet" v-html="snippet(post)"></p>
        </router-link>
      </div>
    </template>

    <div v-else class="search-suggest">
      <p class="search-hint">输入关键词开始搜索。支持标题、摘要和正文匹配。</p>
      <div v-if="hotTags.length" class="tag-cloud">
        <span class="tag-bar-label">热门标签</span>
        <router-link
          v-for="t in hotTags"
          :key="t.name"
          class="tag-pill tag-pill--link"
          :to="`/tag/${encodeURIComponent(t.name)}`"
        >{{ t.name }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { searchPosts, getTaxonomy } from '../api/posts.js'

const route = useRoute()
const query = ref('')
const items = ref([])
const total = ref(0)
const searching = ref(false)
const searched = ref(false)
const errorMsg = ref('')
const hotTags = ref([])

let debounceTimer = null
let requestSeq = 0

/** HTML-escape then wrap the (case-insensitive) match in <mark>. */
function highlight(text, q) {
  const safe = String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const needle = String(q || '').trim()
  if (!needle) return safe
  const idx = safe.toLowerCase().indexOf(needle.toLowerCase())
  if (idx === -1) return safe
  return safe.slice(0, idx)
    + '<mark>' + safe.slice(idx, idx + needle.length) + '</mark>'
    + safe.slice(idx + needle.length)
}

/** Context window around the first body match. */
function snippet(post) {
  const needle = query.value.trim().toLowerCase()
  const body = String(post.content || '')
  const idx = needle ? body.toLowerCase().indexOf(needle) : -1
  if (idx === -1) return ''
  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + needle.length + 60)
  const text = (start > 0 ? '…' : '') + body.slice(start, end).replace(/\s+/g, ' ').trim() + (end < body.length ? '…' : '')
  return highlight(text, query.value)
}

async function runSearch() {
  const q = query.value.trim()
  if (!q) {
    items.value = []
    total.value = 0
    searched.value = false
    return
  }
  const seq = ++requestSeq
  searching.value = true
  errorMsg.value = ''
  try {
    const res = await searchPosts(q)
    if (seq !== requestSeq) return // a newer keystroke already won
    items.value = res.items
    total.value = res.total
    searched.value = true
  } catch (e) {
    if (seq !== requestSeq) return
    errorMsg.value = e.message || '搜索失败，请稍后重试'
    items.value = []
    total.value = 0
    searched.value = true
  } finally {
    if (seq === requestSeq) searching.value = false
  }
}

function onInput() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    requestSeq++
    items.value = []
    searched.value = false
    searching.value = false
    return
  }
  debounceTimer = setTimeout(runSearch, 250)
}

function clearSearch() {
  query.value = ''
  requestSeq++
  items.value = []
  total.value = 0
  searched.value = false
}

onMounted(async () => {
  const q = route.query.q
  if (q) {
    query.value = String(q)
    await runSearch()
  }
  getTaxonomy()
    .then((tax) => { hotTags.value = (tax.tags || []).slice(0, 12) })
    .catch(() => {})
})

onActivated(() => {
  document.title = "搜索 — Chen's Blog"
})
</script>
