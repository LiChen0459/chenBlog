<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <p class="hero-eyebrow">个人博客</p>
      <h1 class="hero-title">
        Chen<span class="accent">'</span>s<br />Blog
      </h1>
      <p class="hero-desc">
        记录技术思考，分享生活碎片。<br />不追逐热点，只写自己的节奏。
      </p>
    </section>

    <!-- Recent Posts -->
    <section class="section">
      <div class="section-header">
        <h2>最近文章</h2>
        <router-link to="/blog" class="more-link">全部文章 →</router-link>
      </div>
      <div class="card-grid">
        <article
          v-for="post in recentPosts"
          :key="post.id"
          class="post-card animate-card"
        >
          <router-link :to="`/blog/${post.id}`">
            <time>
              <span v-if="post.pinned" style="margin-right:6px">📌 置顶</span>
              {{ post.date }}
            </time>
            <h3>{{ post.title }}</h3>
            <p>{{ post.summary }}</p>
            <div class="tag-pills" v-if="post.tags?.length">
              <span class="tag-pill" v-for="t in post.tags" :key="t">{{ t }}</span>
            </div>
            <span class="card-arrow">阅读 →</span>
          </router-link>
        </article>
      </div>
    </section>

    <!-- Recent Moments -->
    <section class="section">
      <div class="section-header">
        <h2>最近动态</h2>
        <router-link to="/moments" class="more-link">全部动态 →</router-link>
      </div>
      <div class="card-grid">
        <div
          v-for="m in recentMoments"
          :key="m.id"
          class="moment-card animate-card"
        >
          <time>{{ m.date }} {{ m.time }}</time>
          <p>{{ m.content }}</p>
          <div class="tag-pills" v-if="m.tags?.length">
            <span class="tag-pill" v-for="t in m.tags" :key="t">{{ t }}</span>
          </div>
          <img v-if="m.image" :src="m.image" alt="" class="moment-img" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { getPosts } from '../api/posts.js'
import { getMoments } from '../api/moments.js'
import { blogPosts, moments as staticMoments } from '../data/posts.js'

const posts = ref([])
const moments = ref([])
const recentPosts = computed(() => posts.value.slice(0, 3))
const recentMoments = computed(() => moments.value.slice(0, 4))

onMounted(async () => {
  try { posts.value = await getPosts(3) } catch { posts.value = blogPosts.slice(0, 3) }
  try { moments.value = await getMoments(4) } catch { moments.value = staticMoments.slice(0, 4) }
})
</script>
