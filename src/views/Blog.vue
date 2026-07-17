<template>
  <div class="blog-page">
    <span class="section-tag">&lt;posts&gt;</span>
    <div class="section-head">
      <h2>文章</h2>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <!-- Tag filter -->
    <div class="tag-bar" v-if="allTags.length">
      <span class="tag-pill" :class="{ active: !activeTag }" @click="activeTag = null">All</span>
      <span
        v-for="t in allTags" :key="t" class="tag-pill"
        :class="{ active: activeTag === t }" @click="activeTag = activeTag === t ? null : t"
      >{{ t }}</span>
    </div>

    <div class="card-grid">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="post-card animate-card"
      >
        <router-link :to="`/blog/${post.id}`">
          <time>{{ post.date }}</time>
          <h3>{{ post.title }}</h3>
          <p>{{ post.summary }}</p>
          <div class="tag-pills" v-if="post.tags?.length">
            <span class="tag-pill" v-for="t in post.tags" :key="t">{{ t }}</span>
          </div>
          <span class="card-arrow">阅读 →</span>
        </router-link>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPosts } from '../api/posts.js'
import { blogPosts } from '../data/posts.js'

const posts = ref([])
const activeTag = ref(null)
const allTags = computed(() => [...new Set(posts.value.flatMap(p => p.tags || []))].sort())
const filteredPosts = computed(() =>
  activeTag.value ? posts.value.filter(p => (p.tags || []).includes(activeTag.value)) : posts.value
)

onMounted(async () => {
  try { posts.value = await getPosts() } catch { posts.value = blogPosts }
})
</script>
