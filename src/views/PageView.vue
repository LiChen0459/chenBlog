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
          <div class="detail-body" v-html="rendered" ref="bodyRef"></div>
          <ShareBar :title="page.title" />
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
import { computed, ref, watch, onMounted, onActivated, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import ShareBar from '../components/ShareBar.vue'
import { getPage, getPages } from '../api/pages.js'
import { renderMarkdown } from '../utils/markdown.js'
import { bindCodeCopy } from '../utils/codeCopy.js'
import { setSeo, textPreview } from '../utils/seo.js'

const route = useRoute()
const page = ref(null)
const allPages = ref([])
const bodyRef = ref(null)
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
    if (page.value) {
      applySeo()
      bindCopy()
    }
  }
}

/** Delegated copy buttons for code blocks; rebind after each re-render. */
let unbindCopy = null
async function bindCopy() {
  unbindCopy?.()
  await nextTick()
  unbindCopy = bindCodeCopy(bodyRef.value)
}

/** Standalone pages are indexable content too — give them real meta tags. */
function applySeo() {
  setSeo({
    title: page.value.title,
    description: textPreview(page.value.content),
    path: `/page/${slug.value}`,
    type: 'article',
  })
}

watch(slug, load)
onMounted(load)
onActivated(() => {
  if (page.value) applySeo()
})
onBeforeUnmount(() => {
  unbindCopy?.()
})
</script>
