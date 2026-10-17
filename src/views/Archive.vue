<template>
  <div class="archive-page">
    <span class="section-tag">&lt;archive&gt;</span>
    <div class="section-head">
      <h2>归档</h2>
      <span v-if="!loading && total" class="section-count">{{ total }} 篇 · {{ byYear.length }} 个年份</span>
    </div>
    <div class="section-line">
      <div class="section-line-inner"></div>
    </div>

    <div v-if="loading" class="sk-loading" aria-hidden="true">
      <div class="sk-line w30" />
      <div class="sk-line w90" />
      <div class="sk-line w70" />
      <div class="sk-line w80" />
    </div>

    <template v-else>
      <!-- Taxonomy: categories (hierarchical) + tags (flat) -->
      <div class="archive-taxonomy" v-if="catTree.length || taxonomy.tags.length">
        <section class="tax-block" v-if="catTree.length">
          <h3 class="tax-title">
            <Icon name="folder" :size="14" />
            分类
          </h3>
          <ul class="cat-tree">
            <li v-for="node in catTree" :key="node.path">
              <router-link class="cat-node" :to="`/category/${node.path.split('/').map(encodeURIComponent).join('/')}`">
                <span class="cat-name">{{ node.name }}</span>
                <span class="cat-count">{{ node.count }}</span>
              </router-link>
              <ul v-if="node.children.length" class="cat-tree cat-tree--sub">
                <li v-for="child in node.children" :key="child.path">
                  <router-link class="cat-node" :to="`/category/${child.path.split('/').map(encodeURIComponent).join('/')}`">
                    <span class="cat-name">{{ child.name }}</span>
                    <span class="cat-count">{{ child.count }}</span>
                  </router-link>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <section class="tax-block" v-if="taxonomy.tags.length">
          <h3 class="tax-title">
            <Icon name="tag" :size="14" />
            标签
          </h3>
          <div class="tag-cloud">
            <router-link
              v-for="t in taxonomy.tags"
              :key="t.name"
              class="tag-pill tag-pill--link"
              :to="`/tag/${encodeURIComponent(t.name)}`"
            >{{ t.name }} <span class="tag-count">{{ t.count }}</span></router-link>
          </div>
        </section>
      </div>

      <!-- Timeline by year -->
      <div class="archive-timeline" v-if="byYear.length">
        <section v-for="(group, i) in visibleYears" :key="group.year" class="archive-year animate-card">
          <h3 class="archive-year-head">
            <span class="archive-year-num">{{ group.year }}</span>
            <span class="archive-year-count">{{ group.items.length }} 篇</span>
          </h3>
          <router-link
            v-for="post in group.items"
            :key="post.id"
            class="archive-row"
            :to="`/blog/${post.id}`"
          >
            <time class="archive-row-date">{{ post.date.slice(5) }}</time>
            <span class="archive-row-title">{{ post.title }}</span>
            <span v-if="post.pinned" class="archive-row-pin" title="置顶">
              <Icon name="bookmark" :size="11" fill="currentColor" />
            </span>
          </router-link>
        </section>
      </div>

      <div v-else class="empty-state">
        <Icon name="archive" :size="26" />
        <span>还没有文章</span>
      </div>

      <div v-if="visibleYears.length < byYear.length" class="load-more-wrap">
        <button class="load-more-btn" :disabled="loadingMore" @click="showOlderYears">
          <Icon v-if="loadingMore" name="loader" :size="14" class="spin" />
          <Icon v-else name="chevron-down" :size="14" />
          <span>{{ loadingMore ? '加载中…' : `显示更早的年份（还有 ${byYear.length - visibleYears.length} 年）` }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onActivated } from 'vue'
import Icon from '../components/Icon.vue'
import { getPosts, getTaxonomy } from '../api/posts.js'
import { blogPosts } from '../data/posts.js'

const posts = ref([])
const taxonomy = ref({ categories: [], tags: [] })
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const yearsShown = ref(2)

const byYear = computed(() => {
  const map = new Map()
  for (const p of posts.value) {
    const y = String(p.date).slice(0, 4) || '未知'
    if (!map.has(y)) map.set(y, [])
    map.get(y).push(p)
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }))
})

const visibleYears = computed(() => byYear.value.slice(0, yearsShown.value))

/** Flat category list (with hierarchical paths) → two-level tree for rendering. */
const catTree = computed(() => {
  const nodes = new Map()
  for (const c of taxonomy.value.categories) nodes.set(c.path, { ...c, children: [] })
  const roots = []
  for (const c of taxonomy.value.categories) {
    const node = nodes.get(c.path)
    const idx = c.path.lastIndexOf('/')
    const parent = idx === -1 ? null : nodes.get(c.path.slice(0, idx))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})

function showOlderYears() {
  loadingMore.value = true
  // Small delay so the button spinner is visible even on instant data.
  setTimeout(() => {
    yearsShown.value += 2
    loadingMore.value = false
  }, 150)
}

async function load() {
  loading.value = true
  try {
    const [page, tax] = await Promise.all([
      getPosts({ limit: 200 }),
      getTaxonomy().catch(() => ({ categories: [], tags: [] })),
    ])
    posts.value = page.items
    total.value = page.total
    taxonomy.value = tax
  } catch {
    posts.value = blogPosts
    total.value = blogPosts.length
  } finally {
    loading.value = false
  }
}

onMounted(load)
onActivated(() => {
  document.title = "归档 — Chen's Blog"
})
</script>
