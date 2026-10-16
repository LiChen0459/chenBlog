<template>
  <div class="blog-page">
    <span class="section-tag">&lt;posts&gt;</span>
    <div class="section-head">
      <h2>文章</h2>
      <span v-if="!loading && total" class="section-count">{{ total }} 篇</span>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Tag filter -->
    <div class="tag-bar" v-if="allTags.length">
      <span class="tag-pill" :class="{ active: !activeTag }" @click="activeTag = null">全部</span>
      <span
        v-for="t in allTags" :key="t" class="tag-pill"
        :class="{ active: activeTag === t }" @click="activeTag = activeTag === t ? null : t"
      >{{ t }}</span>
    </div>

    <div v-if="loading" class="card-grid sk-loading" aria-hidden="true">
      <div v-for="n in 6" :key="`sk-${n}`" class="sk-card">
        <div class="sk-line w30" />
        <div class="sk-line t w70" />
        <div class="sk-line w90" />
        <div class="sk-line w45" />
      </div>
    </div>

    <div v-else-if="filteredPosts.length" class="card-grid">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="post-card animate-card"
        :class="{ pinned: post.pinned }"
      >
        <span v-if="post.pinned" class="card-bookmark" title="置顶">
          <Icon name="bookmark" :size="12" fill="currentColor" />
        </span>
        <router-link :to="`/blog/${post.id}`">
          <div class="card-meta">
            <time>{{ post.date }}</time>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.summary }}</p>
          <div class="tag-pills" v-if="post.tags?.length">
            <span class="tag-pill" v-for="t in post.tags" :key="t">{{ t }}</span>
          </div>
          <span class="card-arrow">阅读 <Icon name="arrow-up-right" :size="13" /></span>
        </router-link>
      </article>
    </div>

    <div v-else class="empty-state">
      <Icon name="file-text" :size="26" />
      <span>{{ activeTag ? `没有「${activeTag}」标签的文章` : '还没有文章' }}</span>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && filteredPosts.length" class="load-more-wrap">
      <button v-if="hasMore" class="load-more-btn" :disabled="loadingMore" @click="loadMore">
        <Icon v-if="loadingMore" name="loader" :size="14" class="spin" />
        <Icon v-else name="chevron-down" :size="14" />
        <span>{{ loadingMore ? '加载中…' : '加载更多' }}</span>
      </button>
      <p v-else class="load-more-end">已经到底了 · 共 {{ total }} 篇</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Icon from '../components/Icon.vue'
import { getPosts } from '../api/posts.js'
import { blogPosts } from '../data/posts.js'

const PAGE_SIZE = 9

const posts = ref([])
const activeTag = ref(null)
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const total = ref(0)

const allTags = computed(() => [...new Set(posts.value.flatMap(p => p.tags || []))].sort())
const filteredPosts = computed(() =>
  activeTag.value ? posts.value.filter(p => (p.tags || []).includes(activeTag.value)) : posts.value
)

async function fetchPage(offset) {
  const { items, total: t, hasMore: more } = await getPosts({ limit: PAGE_SIZE, offset })
  posts.value = offset ? [...posts.value, ...items] : items
  total.value = t
  hasMore.value = more
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await fetchPage(posts.value.length)
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

/** Tag filtering happens client-side, so pull the remaining pages in first. */
async function ensureAllLoaded() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    while (hasMore.value) await fetchPage(posts.value.length)
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

watch(activeTag, (t) => {
  if (t && hasMore.value) ensureAllLoaded()
})

onMounted(async () => {
  try {
    await fetchPage(0)
  } catch {
    posts.value = blogPosts
    total.value = blogPosts.length
    hasMore.value = false
  } finally {
    loading.value = false
  }
})
</script>
