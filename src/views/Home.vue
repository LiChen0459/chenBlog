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
      <div class="hero-links">
        <router-link to="/archive" class="hero-link">
          <Icon name="archive" :size="14" />
          归档
        </router-link>
        <router-link to="/page/about" class="hero-link">
          <Icon name="user" :size="14" />
          关于我
        </router-link>
        <a href="/rss.xml" class="hero-link" title="RSS 订阅">
          <Icon name="rss" :size="14" />
          RSS
        </a>
      </div>
    </section>

    <!-- Recent Posts -->
    <section class="section">
      <div class="section-header">
        <h2>最近文章</h2>
        <router-link to="/blog" class="more-link">全部文章 →</router-link>
      </div>

      <div v-if="loading" class="card-grid sk-loading" aria-hidden="true">
        <div v-for="n in 2" :key="`sk-post-${n}`" class="sk-card">
          <div class="sk-line w30" />
          <div class="sk-line t w70" />
          <div class="sk-line w90" />
          <div class="sk-line w45" />
        </div>
      </div>

      <div v-else-if="recentPosts.length" class="card-grid">
        <article
          v-for="post in recentPosts"
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
        <span>还没有文章</span>
      </div>
    </section>

    <!-- Recent Moments -->
    <section class="section">
      <div class="section-header">
        <h2>最近动态</h2>
        <router-link to="/moments" class="more-link">全部动态 →</router-link>
      </div>

      <div v-if="loading" class="card-grid sk-loading" aria-hidden="true">
        <div v-for="n in 2" :key="`sk-moment-${n}`" class="sk-card">
          <div class="sk-line w30" />
          <div class="sk-line w90" />
          <div class="sk-line w45" />
        </div>
      </div>

      <div v-else-if="recentMoments.length" class="card-grid">
        <div
          v-for="m in recentMoments"
          :key="m.id"
          class="moment-card animate-card"
        >
          <time>{{ m.date }} {{ m.time }}</time>
          <p>{{ m.content }}</p>
          <MomentGallery :images="m.images" @open="openLightbox($event, m)" />
          <div class="tag-pills" v-if="m.tags?.length">
            <span class="tag-pill" v-for="t in m.tags" :key="t">{{ t }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <Icon name="camera" :size="26" />
        <span>还没有动态</span>
      </div>
    </section>

    <Lightbox
      :open="lb.open"
      :images="lb.images"
      :start="lb.start"
      @close="lb.open = false"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import Icon from '../components/Icon.vue'
import MomentGallery from '../components/MomentGallery.vue'
import Lightbox from '../components/Lightbox.vue'
import { getPosts } from '../api/posts.js'
import { getMoments } from '../api/moments.js'
import { blogPosts, moments as staticMoments } from '../data/posts.js'
import { momentImages } from '../utils/moment.js'

const posts = ref([])
const moments = ref([])
const loading = ref(true)

const recentPosts = computed(() => posts.value.slice(0, 3))
const recentMoments = computed(() =>
  moments.value.slice(0, 4).map((m) => ({ ...m, images: momentImages(m) }))
)

const lb = reactive({ open: false, images: [], start: 0 })
function openLightbox(index, moment) {
  lb.images = momentImages(moment)
  lb.start = index
  lb.open = true
}

onMounted(async () => {
  document.title = "Chen's Blog — 记录技术思考，分享生活碎片"
  try {
    const [p, m] = await Promise.all([
      getPosts({ limit: 3 }).then((r) => r.items).catch(() => blogPosts.slice(0, 3)),
      getMoments(4).catch(() => staticMoments.slice(0, 4)),
    ])
    posts.value = p || []
    moments.value = m || []
  } finally {
    loading.value = false
  }
})
</script>
