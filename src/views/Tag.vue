<template>
  <div class="tag-page">
    <span class="section-tag">&lt;tag&gt;</span>
    <div class="section-head">
      <h2>标签 · {{ name }}</h2>
      <span v-if="!loading && total" class="section-count">{{ total }} 篇</span>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <nav class="crumb">
      <router-link to="/archive" class="crumb-root">归档</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ name }}</span>
    </nav>

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
      <Icon name="tag" :size="26" />
      <span>这个标签下还没有文章</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import PostCards from '../components/PostCards.vue'
import { getPosts } from '../api/posts.js'

const route = useRoute()
const posts = ref([])
const total = ref(0)
const loading = ref(true)

const name = computed(() => decodeURIComponent(route.params.name || ''))

async function load() {
  loading.value = true
  try {
    const page = await getPosts({ tag: name.value, limit: 200 })
    posts.value = page.items
    total.value = page.total
  } catch {
    posts.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(name, load)
onMounted(load)
onActivated(() => {
  document.title = `${name.value} — Chen's Blog`
})
</script>
