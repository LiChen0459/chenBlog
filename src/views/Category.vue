<template>
  <div class="category-page">
    <span class="section-tag">&lt;category&gt;</span>
    <div class="section-head">
      <h2>{{ leafName || '分类' }}</h2>
      <span v-if="!loading && total" class="section-count">{{ total }} 篇</span>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Breadcrumb: every ancestor path links back -->
    <nav class="crumb" v-if="ancestors.length">
      <router-link to="/archive" class="crumb-root">归档</router-link>
      <template v-for="(a, i) in ancestors" :key="a.path">
        <span class="crumb-sep">/</span>
        <router-link v-if="i < ancestors.length - 1" :to="`/category/${a.path.split('/').map(encodeURIComponent).join('/')}`">{{ a.name }}</router-link>
        <span v-else class="crumb-current">{{ a.name }}</span>
      </template>
    </nav>

    <!-- Child categories, when the active one has any -->
    <div class="tag-bar" v-if="children.length">
      <span class="tag-bar-label">子分类</span>
      <router-link
        v-for="child in children"
        :key="child.path"
        class="tag-pill tag-pill--link"
        :to="`/category/${child.path.split('/').map(encodeURIComponent).join('/')}`"
      >{{ child.name }} <span class="tag-count">{{ child.count }}</span></router-link>
    </div>

    <div v-if="loading" class="card-grid sk-loading" aria-hidden="true">
      <div v-for="n in 3" :key="`sk-${n}`" class="sk-card">
        <div class="sk-line w30" />
        <div class="sk-line t w70" />
        <div class="sk-line w90" />
        <div class="sk-line w45" />
      </div>
    </div>

    <PostCards v-else-if="posts.length" :posts="posts" />

    <div v-else class="empty-state">
      <Icon name="folder" :size="26" />
      <span>这个分类下还没有文章</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import PostCards from '../components/PostCards.vue'
import { getPosts, getTaxonomy } from '../api/posts.js'
import { setSeo } from '../utils/seo.js'

const route = useRoute()
const posts = ref([])
const taxonomy = ref({ categories: [], tags: [] })
const total = ref(0)
const loading = ref(true)

/** pathMatch gives the (possibly multi-segment) category path. */
const path = computed(() => {
  const raw = route.params.pathMatch
  const segments = Array.isArray(raw) ? raw : [raw].filter(Boolean)
  return segments.map((s) => decodeURIComponent(s)).join('/')
})

const leafName = computed(() => path.value.split('/').filter(Boolean).pop() || '')
const ancestors = computed(() => {
  const parts = path.value.split('/').filter(Boolean)
  return parts.map((name, i) => ({ path: parts.slice(0, i + 1).join('/'), name }))
})

const children = computed(() =>
  taxonomy.value.categories.filter((c) => {
    if (!path.value || !c.path.startsWith(`${path.value}/`)) return false
    return !c.path.slice(path.value.length + 1).includes('/')
  })
)

async function load() {
  loading.value = true
  try {
    const [page, tax] = await Promise.all([
      getPosts({ category: path.value, limit: 200 }),
      getTaxonomy().catch(() => ({ categories: [], tags: [] })),
    ])
    posts.value = page.items
    total.value = page.total
    taxonomy.value = tax
  } catch {
    posts.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(path, load)
onMounted(() => {
  setSeo({
    title: `分类：${leafName.value || '全部'}`,
    description: `分类「${path.value || '全部'}」下的全部文章。`,
    path: path.value ? `/category/${path.value.split('/').map(encodeURIComponent).join('/')}` : '/category',
  })
  load()
})
onActivated(() => {
  setSeo({
    title: `分类：${leafName.value || '全部'}`,
    description: `分类「${path.value || '全部'}」下的全部文章。`,
    path: path.value ? `/category/${path.value.split('/').map(encodeURIComponent).join('/')}` : '/category',
  })
})
</script>
