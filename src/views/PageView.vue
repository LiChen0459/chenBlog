<template>
  <div class="page-view">
    <div v-if="loading" class="detail">
      <p style="color:var(--text-muted);text-align:center;padding-top:80px;">加载中...</p>
    </div>

    <div v-else-if="page" class="detail">
      <div class="detail-layout">
        <article>
          <header class="detail-header">
            <div class="detail-meta">
              <time>更新于 {{ page.updated_at }}</time>
            </div>
            <h1>{{ page.title }}</h1>
          </header>
          <div class="section-line">
            <div class="section-line-inner"></div>
          </div>
          <div class="detail-body" v-html="rendered"></div>
        </article>
      </div>

      <nav v-if="otherPages.length" class="page-view-nav">
        <span class="page-view-nav-label">更多页面</span>
        <router-link
          v-for="p in otherPages"
          :key="p.slug"
          class="page-view-nav-link"
          :to="`/page/${p.slug}`"
        >{{ p.title }}</router-link>
      </nav>
    </div>

    <div v-else class="detail not-found">
      <p>页面不存在。</p>
      <router-link to="/archive" class="back-link">
        <Icon name="arrow-left" :size="14" />
        返回归档
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { getPage, getPages } from '../api/pages.js'
import { renderMarkdown } from '../utils/markdown.js'

const route = useRoute()
const page = ref(null)
const allPages = ref([])
const loading = ref(true)

const slug = computed(() => route.params.slug || '')
const rendered = computed(() => renderMarkdown(page.value?.content || ''))
const otherPages = computed(() => allPages.value.filter((p) => p.slug !== page.value?.slug))

async function load() {
  loading.value = true
  try {
    const [current, all] = await Promise.all([
      getPage(slug.value).catch(() => null),
      getPages().catch(() => []),
    ])
    page.value = current
    allPages.value = all || []
  } catch {
    page.value = null
  } finally {
    loading.value = false
  }
}

watch(slug, load)
onMounted(load)
onActivated(() => {
  if (page.value) document.title = `${page.value.title} — Chen's Blog`
})
</script>
